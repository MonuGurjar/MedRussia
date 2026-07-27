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
    profileImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
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
    profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
    specialization: 'Student Life & Academics',
    isFeatured: true,
  },
  {
    id: 'senior-mentor-2',
    name: 'Priya Patel',
    role: 'Admissions Advisor',
    bio: 'Specializes in NMC documentation, visa processing, and university shortlisting. Helped 200+ students secure their spot.',
    emoji: '📋',
    profileImage: 'https://images.unsplash.com/photo-1594824813566-78a9c26f6eb8?auto=format&fit=crop&w=400&q=80',
    specialization: 'Documentation & Visa',
    isFeatured: true,
  },
  {
    id: 'senior-mentor-3',
    name: 'Vikram Singh',
    role: 'University Relations',
    bio: 'Manages partnerships with 50+ verified Russian universities. Ensures students get direct access to official admission channels.',
    emoji: '🤝',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    specialization: 'University Partnerships',
    isFeatured: true,
  },
  {
    id: 'counselor-1',
    name: 'Sneha Verma',
    role: 'Student Counselor',
    bio: 'MBBS graduate from Russia. Provides one-on-one mentorship for pre-departure preparation and first-year guidance.',
    emoji: '💡',
    profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    specialization: 'Pre-Departure Guidance',
    isFeatured: false,
  },
  {
    id: 'counselor-2',
    name: 'Arjun Mehta',
    role: 'NEET & Eligibility Specialist',
    bio: 'Expert in NEET score analysis and NMC eligibility criteria. Helps students identify the best-fit universities for their profile.',
    emoji: '📊',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    specialization: 'Eligibility Analysis',
    isFeatured: false,
  },
  {
    id: 'counselor-3',
    name: 'Ananya Reddy',
    role: 'Parent Liaison',
    bio: 'Dedicated to addressing parent concerns about safety, finances, and career prospects. Organizes parent webinars regularly.',
    emoji: '👪',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    specialization: 'Parent Communication',
    isFeatured: false,
  },
  {
    id: 'counselor-4',
    name: 'Karan Joshi',
    role: 'Budget & Finance Advisor',
    bio: 'Helps families plan finances for the full 6-year course including tuition, hostel, food, and travel. No hidden cost surprises.',
    emoji: '💰',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    specialization: 'Financial Planning',
    isFeatured: false,
  },
  {
    id: 'tech-lead',
    name: 'Deepak Kumar',
    role: 'Tech Lead',
    bio: 'Built the MedRussia platform from scratch. Ensures students have the best digital tools for comparing universities and tracking applications.',
    emoji: '💻',
    profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    specialization: 'Platform Development',
    isFeatured: false,
  },
  {
    id: 'counselor-5',
    name: 'Riya Kapoor',
    role: 'Russian Language Coach',
    bio: 'Fluent in Russian and Hindi. Helps students prepare for language barriers with crash courses and survival Russian phrases.',
    emoji: '🗣️',
    profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    specialization: 'Language Preparation',
    isFeatured: false,
  },
];
