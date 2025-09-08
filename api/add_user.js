const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env' });

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addUser(username, email, password) {
  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert user into the database
    const { data, error } = await supabase
      .from('users')
      .insert([
        { username: username, email: email, password_hash: hashedPassword }
      ]);
    
    if (error) {
      console.error('Error inserting user:', error);
      return;
    }
    
    console.log('User added successfully:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Add Oscar as admin user
addUser('oscar', 'copd@petgas.com.mx', '3m3ainffbd2a');