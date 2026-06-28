import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const mongoClient = new MongoClient(process.env.MONGODB_URI);

async function seed() {
  try {
    await mongoClient.connect();
    const db = mongoClient.db('medrussia');
    const usersCollection = db.collection('users');

    // Clear existing users from MongoDB
    await usersCollection.deleteMany({});
    console.log('Cleared MongoDB users collection');

    // 1. Seed Super Admin
    console.log('Creating super admin...');
    const adminRes = await supabase.auth.admin.createUser({
      email: 'admin@medrussia.com',
      password: 'SuperSecurePassword123!',
      email_confirm: true
    });

    if (adminRes.error) {
      if (adminRes.error.message.includes('already registered')) {
        console.log('Admin already exists in Supabase, continuing...');
      } else {
        console.error('Error creating admin:', adminRes.error);
      }
    } else {
      const adminId = adminRes.data.user.id;
      await usersCollection.insertOne({
        id: adminId,
        email: 'admin@medrussia.com',
        role: 'admin',
        name: 'Super Admin',
        notifications: [],
        createdAt: new Date().toISOString()
      });
      console.log('Super admin created in MongoDB');
    }

    // 2. Seed Student
    console.log('Creating student...');
    const studentRes = await supabase.auth.admin.createUser({
      email: 'student@medrussia.com',
      password: 'StudentPassword123!',
      email_confirm: true
    });

    if (studentRes.error) {
      if (studentRes.error.message.includes('already registered')) {
        console.log('Student already exists in Supabase, continuing...');
      } else {
        console.error('Error creating student:', studentRes.error);
      }
    } else {
      const studentId = studentRes.data.user.id;
      await usersCollection.insertOne({
        id: studentId,
        email: 'student@medrussia.com',
        role: 'student',
        name: 'Test Student',
        phone: '+919876543210',
        neetScore: 450,
        budget: '20-30',
        shortlistedUniversities: [],
        documents: {},
        notifications: [],
        createdAt: new Date().toISOString()
      });
      console.log('Student created in MongoDB');
    }

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoClient.close();
  }
}

seed();
