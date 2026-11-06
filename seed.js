require('dotenv').config();
const dns = require('dns');
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const mongoose = require('mongoose');
const User = require('./models/User');
const Event = require('./models/Event');

const ORGANIZER = {
  name: 'Campus Events Office',
  email: 'organizer@campuspulse.com',
  password: 'Organizer@123',
  role: 'organizer',
};
const STUDENT = {
  name: 'Demo Student',
  email: 'student@campuspulse.com',
  password: 'Student@123',
  role: 'student',
};

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

async function seed({ reset = false } = {}) {
  if (reset) {
    await Event.deleteMany({});
    await User.deleteMany({ email: { $in: [ORGANIZER.email, STUDENT.email] } });
  }
  let organizer = await User.findOne({ email: ORGANIZER.email });
  if (!organizer) organizer = await User.create(ORGANIZER);
  if (!(await User.findOne({ email: STUDENT.email }))) await User.create(STUDENT);

  if ((await Event.countDocuments()) > 0) return;

  const o = organizer._id;
  await Event.insertMany([
    { title: 'HackNight 2026', description: 'A 12-hour overnight hackathon. Form teams of up to four and build something useful for campus life.', category: 'Technology', venue: 'Innovation Lab, Block C', date: daysFromNow(5), time: '18:00', capacity: 80, organizer: o },
    { title: 'Intro to Machine Learning Workshop', description: 'Hands-on Python session covering the basics of training your first model. Bring a laptop.', category: 'Workshop', venue: 'Computer Lab 2', date: daysFromNow(7), time: '14:00', capacity: 30, organizer: o },
    { title: 'Annual Cultural Fest: Rang', description: 'Music, dance, food stalls and performances from every department.', category: 'Cultural', venue: 'Main Auditorium', date: daysFromNow(12), time: '17:30', capacity: 500, organizer: o },
    { title: 'Inter-Department Football Cup', description: 'Knockout football tournament. Register your team at the sports office.', category: 'Sports', venue: 'North Football Ground', date: daysFromNow(9), time: '09:00', capacity: 120, organizer: o },
    { title: 'Career Fair & Resume Clinic', description: 'Meet recruiters from 40+ companies and get your resume reviewed on the spot.', category: 'Career', venue: 'Student Activity Centre', date: daysFromNow(15), time: '10:00', capacity: 300, organizer: o },
    { title: 'Guest Lecture: Future of Renewable Energy', description: 'A talk by an industry expert followed by Q&A.', category: 'Academic', venue: 'Seminar Hall A', date: daysFromNow(4), time: '11:30', capacity: 150, organizer: o },
    { title: 'Open Mic Evening', description: 'Poetry, stand-up, music, anything goes. Sign up to perform or just come and listen.', category: 'Social', venue: 'Campus Cafe Lawn', date: daysFromNow(3), time: '19:00', capacity: 60, organizer: o },
    { title: 'UI/UX Design Sprint', description: 'Learn design thinking and prototype an app in a single afternoon.', category: 'Workshop', venue: 'Design Studio, Block D', date: daysFromNow(10), time: '13:00', capacity: 25, organizer: o },
    { title: 'Photography Walk', description: 'Explore the campus golden hour with fellow shutterbugs. All cameras welcome, phones too.', category: 'Social', venue: 'Main Gate', date: daysFromNow(6), time: '16:30', capacity: 20, organizer: o },
    { title: 'Startup Pitch Competition', description: 'Student teams pitch to a panel of founders and investors.', category: 'Career', venue: 'Incubation Centre', date: daysFromNow(20), time: '15:00', capacity: 100, organizer: o },
  ]);
  console.log('Seeded sample events and demo accounts.');
}

module.exports = seed;

if (require.main === module) {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI. Set it in .env before running the seed script.');
    process.exit(1);
  }

  (async () => {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB.');
    await seed({ reset: process.argv.includes('--reset') });
    console.log('Seeding complete.');
  })().catch((e) => {
    console.error('Seed failed:', e.message);
    process.exit(1);
  }).finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
}
