const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let envContent = '';
try {
  envContent = fs.readFileSync(path.join(__dirname, '../etl/.env'), 'utf8');
} catch (e) {
  try {
    envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  } catch (e2) {}
}

const lines = envContent.split('\n');
const env = {};
for (const line of lines) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("ERROR: Missing Supabase credentials in etl/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const accounts = [
  { email: 'admin@electorportal.com', username: 'admin', password: 'AdminPassword123!', role: 'System Admin' },
  { email: 'operator@electorportal.com', username: 'operator', password: 'OperatorPassword123!', role: 'Data Operator' },
  { email: 'supervisor@electorportal.com', username: 'supervisor', password: 'SupervisorPassword123!', role: 'Electoral Supervisor' },
];

async function main() {
  console.log("Provisioning 3 user accounts in Supabase Auth...");
  
  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('ERROR listing users:', listError.message);
      return;
    }

    for (const acc of accounts) {
      const existing = users.find(u => u.email && u.email.toLowerCase() === acc.email.toLowerCase());

      if (existing) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
          password: acc.password,
          email_confirm: true,
          user_metadata: { role: acc.role, username: acc.username }
        });
        if (updateError) {
          console.error(`ERROR updating ${acc.email}:`, updateError.message);
        } else {
          console.log(`✓ UPDATED: ${acc.username} (${acc.email}) -> Password: ${acc.password}`);
        }
      } else {
        const { data, error: createError } = await supabase.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: { role: acc.role, username: acc.username }
        });
        if (createError) {
          console.error(`ERROR creating ${acc.email}:`, createError.message);
        } else {
          console.log(`✓ CREATED: ${acc.username} (${acc.email}) -> Password: ${acc.password}`);
        }
      }
    }

    console.log("PROVISIONING SUCCESSFUL");
  } catch (err) {
    console.error('EXCEPTION:', err.message);
  }
}

main();
