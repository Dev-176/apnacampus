/**
 * ApnaCampus — Demo Students Seeder Script
 *
 * Requirements:
 * - Creates 8-10 demo students as real auth.users in Supabase with is_seed = true.
 * - Reads service role key ONLY from shell environment variable SUPABASE_SERVICE_ROLE_KEY at runtime.
 * - NEVER reads service role key from .env or any file.
 * - NEVER imported by application code.
 *
 * Usage:
 *   Windows PowerShell:
 *     $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *     npx ts-node scripts/seed-demo-users.ts
 *
 *   macOS/Linux:
 *     SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" npx ts-node scripts/seed-demo-users.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env to obtain EXPO_PUBLIC_SUPABASE_URL / TEST_SUPABASE_URL
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is required in shell environment.');
  console.error('Do NOT put this key in .env or any file. Pass it via shell environment variable:');
  console.error('  PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="your-key"; npx ts-node scripts/seed-demo-users.ts\n');
  process.exit(1);
}

if (!supabaseUrl) {
  console.error('\n❌ ERROR: Supabase URL not found in environment (TEST_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL).\n');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Fixed Seed UUIDs
const CITIES = {
  ALIGARH: 'c1000000-0000-0000-0000-000000000001',
  GREATER_NOIDA: 'c1000000-0000-0000-0000-000000000002',
  DELHI: 'c1000000-0000-0000-0000-000000000003',
  LUCKNOW: 'c1000000-0000-0000-0000-000000000004',
  AGRA: 'c1000000-0000-0000-0000-000000000005',
  JAIPUR: 'c1000000-0000-0000-0000-000000000006',
  KANPUR: 'c1000000-0000-0000-0000-000000000007',
  MEERUT: 'c1000000-0000-0000-0000-000000000008',
  NOIDA: 'c1000000-0000-0000-0000-000000000009',
  GHAZIABAD: 'c1000000-0000-0000-0000-000000000010',
  GURUGRAM: 'c1000000-0000-0000-0000-000000000011',
  FARIDABAD: 'c1000000-0000-0000-0000-000000000012',
};

const COLLEGES = {
  BENNETT: 'e1000000-0000-0000-0000-000000000001',
  GALGOTIAS: 'e1000000-0000-0000-0000-000000000002',
  SHARDA: 'e1000000-0000-0000-0000-000000000003',
  SNU: 'e1000000-0000-0000-0000-000000000004',
  IITD: 'e1000000-0000-0000-0000-000000000005',
  JMI: 'e1000000-0000-0000-0000-000000000006',
  AMU: 'e1000000-0000-0000-0000-000000000007',
};

const COURSES = {
  BTECH: 'a1000000-0000-0000-0000-000000000001',
  BCA: 'a1000000-0000-0000-0000-000000000002',
  BSC: 'a1000000-0000-0000-0000-000000000003',
  MBBS: 'a1000000-0000-0000-0000-000000000004',
  MBA: 'a1000000-0000-0000-0000-000000000005',
};

const BRANCHES = {
  CSE: 'b1000000-0000-0000-0000-000000000001',
  AI_DS: 'b1000000-0000-0000-0000-000000000002',
  ECE: 'b1000000-0000-0000-0000-000000000003',
  MECH: 'b1000000-0000-0000-0000-000000000004',
  CIVIL: 'b1000000-0000-0000-0000-000000000005',
};

interface DemoStudent {
  email: string;
  fullName: string;
  username: string;
  bio: string;
  homeCityId: string;
  currentCityId: string;
  collegeId: string;
  courseId: string;
  branchId: string;
  yearOfStudy: number;
  interests: string[];
  skillsToTeach: string[];
  isVerified: boolean;
}

const DEMO_STUDENTS: DemoStudent[] = [
  {
    email: 'demo.aarav@apnacampus.internal',
    fullName: 'Aarav Sharma',
    username: 'aarav_aligarh',
    bio: '2nd year CSE at Bennett from Aligarh. Love building mobile apps and playing evening cricket.',
    homeCityId: CITIES.ALIGARH,
    currentCityId: CITIES.GREATER_NOIDA,
    collegeId: COLLEGES.BENNETT,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.CSE,
    yearOfStudy: 2,
    interests: ['Coding & Web Dev', 'Cricket', 'Startups & Entrepreneurship'],
    skillsToTeach: ['Python', 'React / React Native'],
    isVerified: true,
  },
  {
    email: 'demo.zainab@apnacampus.internal',
    fullName: 'Zainab Khan',
    username: 'zainab_k',
    bio: 'AI & Data Science student at Galgotias. Looking to connect with fellow Aligarh folks in Knowledge Park.',
    homeCityId: CITIES.ALIGARH,
    currentCityId: CITIES.GREATER_NOIDA,
    collegeId: COLLEGES.GALGOTIAS,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.AI_DS,
    yearOfStudy: 3,
    interests: ['AI / Machine Learning', 'Competitive Programming', 'Reading & Literature'],
    skillsToTeach: ['Python', 'Data Structures & Algorithms'],
    isVerified: false,
  },
  {
    email: 'demo.priyesh@apnacampus.internal',
    fullName: 'Priyesh Verma',
    username: 'priyesh_v',
    bio: 'Freshman at Sharda University, originally from Civil Lines, Aligarh. Passionate about robotics.',
    homeCityId: CITIES.ALIGARH,
    currentCityId: CITIES.GREATER_NOIDA,
    collegeId: COLLEGES.SHARDA,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.ECE,
    yearOfStudy: 1,
    interests: ['Robotics & IoT', 'Gaming & Esports'],
    skillsToTeach: ['C / C++'],
    isVerified: false,
  },
  {
    email: 'demo.ananya@apnacampus.internal',
    fullName: 'Ananya Gupta',
    username: 'ananya_g',
    bio: 'Lucknow native studying at Bennett University. Active debater and amateur photographer.',
    homeCityId: CITIES.LUCKNOW,
    currentCityId: CITIES.GREATER_NOIDA,
    collegeId: COLLEGES.BENNETT,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.CSE,
    yearOfStudy: 2,
    interests: ['Coding & Web Dev', 'Photography', 'Debating & MUN'],
    skillsToTeach: ['Java', 'Spoken English & Communication'],
    isVerified: true,
  },
  {
    email: 'demo.rohan@apnacampus.internal',
    fullName: 'Rohan Dixit',
    username: 'rohan_d',
    bio: 'Final year CSE at IIT Delhi from Agra. Competitive coder and startup enthusiast.',
    homeCityId: CITIES.AGRA,
    currentCityId: CITIES.DELHI,
    collegeId: COLLEGES.IITD,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.CSE,
    yearOfStudy: 4,
    interests: ['Competitive Programming', 'Startups & Entrepreneurship'],
    skillsToTeach: ['Data Structures & Algorithms', 'Python'],
    isVerified: true,
  },
  {
    email: 'demo.meera@apnacampus.internal',
    fullName: 'Meera Singhal',
    username: 'meera_s',
    bio: 'From Jaipur, currently in 2nd year at Shiv Nadar. Love guitar jamming and AI research.',
    homeCityId: CITIES.JAIPUR,
    currentCityId: CITIES.GREATER_NOIDA,
    collegeId: COLLEGES.SNU,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.AI_DS,
    yearOfStudy: 2,
    interests: ['AI / Machine Learning', 'Music & Jamming', 'Badminton'],
    skillsToTeach: ['Machine Learning Basics', 'Guitar / Keyboard'],
    isVerified: false,
  },
  {
    email: 'demo.faizan@apnacampus.internal',
    fullName: 'Faizan Siddiqui',
    username: 'faizan_s',
    bio: 'Kanpur to Jamia Millia Islamia. Mechanical engineering junior and football enthusiast.',
    homeCityId: CITIES.KANPUR,
    currentCityId: CITIES.DELHI,
    collegeId: COLLEGES.JMI,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.MECH,
    yearOfStudy: 3,
    interests: ['Football', 'Robotics & IoT'],
    skillsToTeach: ['Mathematics for Engineering'],
    isVerified: false,
  },
  {
    email: 'demo.tanya@apnacampus.internal',
    fullName: 'Tanya Sharma',
    username: 'tanya_sharma',
    bio: 'BCA student at Galgotias University from Meerut. Designing UI/UX and web apps.',
    homeCityId: CITIES.MEERUT,
    currentCityId: CITIES.GREATER_NOIDA,
    collegeId: COLLEGES.GALGOTIAS,
    courseId: COURSES.BCA,
    branchId: BRANCHES.CSE,
    yearOfStudy: 2,
    interests: ['Graphic Design (Canva/Figma)', 'Video Editing (Premiere/CapCut)', 'Coding & Web Dev'],
    skillsToTeach: ['Graphic Design (Canva/Figma)', 'React / React Native'],
    isVerified: false,
  },
  {
    email: 'demo.devansh@apnacampus.internal',
    fullName: 'Devansh Mishra',
    username: 'devansh_m',
    bio: '3rd year B.Tech at AMU Aligarh. Coding mentor and cricket team captain.',
    homeCityId: CITIES.ALIGARH,
    currentCityId: CITIES.ALIGARH,
    collegeId: COLLEGES.AMU,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.CSE,
    yearOfStudy: 3,
    interests: ['Coding & Web Dev', 'Cricket', 'Finance & Investing'],
    skillsToTeach: ['Java', 'Data Structures & Algorithms'],
    isVerified: true,
  },
  {
    email: 'demo.kunal@apnacampus.internal',
    fullName: 'Kunal Aggarwal',
    username: 'kunal_a',
    bio: 'Ghaziabad native, 1st year CSE at Bennett. Passionate about gaming and Python scripting.',
    homeCityId: CITIES.GHAZIABAD,
    currentCityId: CITIES.GREATER_NOIDA,
    collegeId: COLLEGES.BENNETT,
    courseId: COURSES.BTECH,
    branchId: BRANCHES.CSE,
    yearOfStudy: 1,
    interests: ['Coding & Web Dev', 'Gaming & Esports'],
    skillsToTeach: ['Python'],
    isVerified: false,
  },
];

async function seedDemoUsers() {
  console.log(`\n🌱 Starting ApnaCampus Demo Users Seeding (${DEMO_STUDENTS.length} students)...\n`);

  for (const student of DEMO_STUDENTS) {
    try {
      // 1. Create or get user in auth.users
      const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
        email: student.email,
        password: 'DemoPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: student.fullName,
          is_18_confirmed: true,
        },
      });

      let userId = userData?.user?.id;

      if (createError) {
        if (createError.message.includes('already exists') || createError.message.includes('unique')) {
          // Find existing user ID
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existing = listData?.users?.find((u) => u.email === student.email);
          if (existing) {
            userId = existing.id;
            console.log(`  ℹ️ User ${student.email} already exists (${userId}). Updating profile...`);
          } else {
            console.warn(`  ⚠️ Could not find existing user for ${student.email}:`, createError.message);
            continue;
          }
        } else {
          console.error(`  ❌ Error creating ${student.email}:`, createError.message);
          continue;
        }
      }

      if (!userId) continue;

      // 2. Upsert profile with demo data
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: userId,
            full_name: student.fullName,
            username: student.username,
            bio: student.bio,
            home_city_id: student.homeCityId,
            current_city_id: student.currentCityId,
            college_id: student.collegeId,
            course_id: student.courseId,
            branch_id: student.branchId,
            year_of_study: student.yearOfStudy,
            interests: student.interests,
            skills_to_teach: student.skillsToTeach,
            is_18_confirmed: true,
            is_verified: student.isVerified,
            is_onboarded: true,
            is_active: true,
            is_suspended: false,
            is_banned: false,
            is_seed: true,
            visibility: 'discoverable',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        console.error(`  ❌ Error upserting profile for ${student.fullName}:`, profileError.message);
      } else {
        console.log(`  ✅ Seeded: ${student.fullName} (@${student.username}) — [${student.email}]`);
      }
    } catch (err: unknown) {
      console.error(`  ❌ Unexpected error seeding ${student.email}:`, err);
    }
  }

  console.log('\n🎉 Finished seeding demo students!\n');
}

seedDemoUsers();
