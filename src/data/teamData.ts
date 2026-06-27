export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  emoji: string;
  profileImage?: string;
  specialization: string;
  isFeatured: boolean;
  linkedEmail?: string;
  socials?: {
    whatsapp?: string;
    instagram?: string;
    youtube?: string;
  };
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'amit-gurjar',
    name: 'Amit Gurjar',
    role: 'Founder & Lead Counselor',
    bio: 'Currently pursuing MBBS in Russia. Passionate about helping Indian students navigate admissions with honest, transparent guidance.',
    emoji: '👨‍⚕️',
    specialization: 'Admissions & Strategy',
    isFeatured: true,
    socials: {
      whatsapp: 'https://wa.me/917375017401',
      instagram: 'https://www.instagram.com/med_vlog716/',
      youtube: 'https://youtube.com/@amit_gurjar-w1',
    },
  },
  {
    id: 'senior-mentor-1',
    name: 'Rahul Sharma',
    role: 'Senior Mentor',
    bio: '4th year MBBS student at a top Russian university. Guides students on academic life, hostel, and day-to-day survival tips in Russia.',
    emoji: '🎓',
    specialization: 'Student Life & Academics',
    isFeatured: true,
  },
  {
    id: 'senior-mentor-2',
    name: 'Priya Patel',
    role: 'Admissions Advisor',
    bio: 'Specializes in NMC documentation, visa processing, and university shortlisting. Helped 200+ students secure their spot.',
    emoji: '📋',
    specialization: 'Documentation & Visa',
    isFeatured: true,
  },
  {
    id: 'senior-mentor-3',
    name: 'Vikram Singh',
    role: 'University Relations',
    bio: 'Manages partnerships with 50+ verified Russian universities. Ensures students get direct access to official admission channels.',
    emoji: '🤝',
    specialization: 'University Partnerships',
    isFeatured: true,
  },
  {
    id: 'counselor-1',
    name: 'Sneha Verma',
    role: 'Student Counselor',
    bio: 'MBBS graduate from Russia. Provides one-on-one mentorship for pre-departure preparation and first-year guidance.',
    emoji: '💡',
    specialization: 'Pre-Departure Guidance',
    isFeatured: false,
  },
  {
    id: 'counselor-2',
    name: 'Arjun Mehta',
    role: 'NEET & Eligibility Specialist',
    bio: 'Expert in NEET score analysis and NMC eligibility criteria. Helps students identify the best-fit universities for their profile.',
    emoji: '📊',
    specialization: 'Eligibility Analysis',
    isFeatured: false,
  },
  {
    id: 'counselor-3',
    name: 'Ananya Reddy',
    role: 'Parent Liaison',
    bio: 'Dedicated to addressing parent concerns about safety, finances, and career prospects. Organizes parent webinars regularly.',
    emoji: '👪',
    specialization: 'Parent Communication',
    isFeatured: false,
  },
  {
    id: 'counselor-4',
    name: 'Karan Joshi',
    role: 'Budget & Finance Advisor',
    bio: 'Helps families plan finances for the full 6-year course including tuition, hostel, food, and travel. No hidden cost surprises.',
    emoji: '💰',
    specialization: 'Financial Planning',
    isFeatured: false,
  },
  {
    id: 'tech-lead',
    name: 'Deepak Kumar',
    role: 'Tech Lead',
    bio: 'Built the MedRussia platform from scratch. Ensures students have the best digital tools for comparing universities and tracking applications.',
    emoji: '💻',
    specialization: 'Platform Development',
    isFeatured: false,
  },
  {
    id: 'counselor-5',
    name: 'Riya Kapoor',
    role: 'Russian Language Coach',
    bio: 'Fluent in Russian and Hindi. Helps students prepare for language barriers with crash courses and survival Russian phrases.',
    emoji: '🗣️',
    specialization: 'Language Preparation',
    isFeatured: false,
  },
];
