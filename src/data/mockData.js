export const studentsDB = [
  { id: 0, name: 'Aryan Sharma',  initials: 'A',  cls: 'Class 10', city: 'Bhopal', area: 'Arera Colony',   subjects: ['Maths', 'Science'],          avClass: 'av-navy', phone: '+91 98765 43210' },
  { id: 1, name: 'Sneha Patel',   initials: 'S',  cls: 'Class 12', city: 'Bhopal', area: 'MP Nagar',        subjects: ['Physics', 'Chemistry'],       avClass: 'av-gold', phone: '+91 87654 32109' },
  { id: 2, name: 'Rahul Singh',   initials: 'R',  cls: 'Class 9',  city: 'Bhopal', area: 'Kolar Road',      subjects: ['Science'],                    avClass: 'av-blue', phone: '+91 76543 21098' },
  { id: 3, name: 'Anjali Sharma', initials: 'An', cls: 'Class 11', city: 'Bhopal', area: 'Shahpura',        subjects: ['Maths', 'English'],           avClass: 'av-green',phone: '+91 65432 10987' },
  { id: 4, name: 'Karan Verma',   initials: 'K',  cls: 'Class 8',  city: 'Bhopal', area: 'Govindpura',      subjects: ['All Subjects'],               avClass: 'av-navy', phone: '+91 54321 09876' },
  { id: 5, name: 'Priti Gupta',   initials: 'Pr', cls: 'Class 10', city: 'Bhopal', area: 'Bhel Township',   subjects: ['Maths'],                      avClass: 'av-blue', phone: '+91 43210 98765' },
  { id: 6, name: 'Aakash Yadav',  initials: 'Aa', cls: 'Class 12', city: 'Bhopal', area: 'Arera Colony',    subjects: ['Physics', 'Maths'],           avClass: 'av-gold', phone: '+91 32109 87654' },
  { id: 7, name: 'Riya Patel',    initials: 'Ri', cls: 'Class 9',  city: 'Bhopal', area: 'MP Nagar',        subjects: ['Science', 'English'],         avClass: 'av-red',  phone: '+91 21098 76543' },
];

export const coinPackages = [
  { id: 'starter', name: 'Starter Pack', emoji: '🪙', coins: 100, price: 100, unlocks: 2 },
  { id: 'standard', name: 'Standard Pack', emoji: '💰', coins: 200, price: 200, unlocks: 4 },
  { id: 'popular', name: 'Popular Pack', emoji: '💎', coins: 250, price: 250, unlocks: 5, popular: true },
];

export const activityFeed = [
  { icon: '👁', iconClass: 'ai-gold', text: 'Priya Verma viewed your profile',           time: '10 min ago' },
  { icon: '🔓', iconClass: 'ai-green', text: 'Rajesh Kumar unlocked your contact',       time: 'Yesterday'  },
  { icon: '⭐', iconClass: 'ai-blue', text: 'Profile bookmarked by Sunita Joshi',        time: '2 days ago' },
  { icon: '👁', iconClass: 'ai-gold', text: 'Anil Singh viewed your profile',             time: '3 days ago' },
];

export const teachersDB = [
  { id: 0, name: 'Priya Verma',  initials: 'P', qual: 'M.Sc Maths',    exp: '6 yrs', city: 'Bhopal', subjects: ['Maths', 'Physics'],    rating: 4.9, students: 38, avClass: 'av-gold' },
  { id: 1, name: 'Rajesh Kumar', initials: 'R', qual: 'B.Ed Science',   exp: '4 yrs', city: 'Bhopal', subjects: ['Science', 'Chemistry'], rating: 4.7, students: 22, avClass: 'av-navy' },
  { id: 2, name: 'Sunita Joshi', initials: 'S', qual: 'M.A. English',   exp: '3 yrs', city: 'Bhopal', subjects: ['English', 'Hindi'],     rating: 4.8, students: 18, avClass: 'av-blue' },
];

export const coinHistory = [
  { type: 'unlock',   desc: 'Aryan Sharma — Class 10',   coins: -50,  balance: 350, date: 'Today 10:24 AM'   },
  { type: 'purchase', desc: 'Popular Pack — ₹250',        coins: +250, balance: 400, date: 'Yesterday 2:00 PM'},
  { type: 'unlock',   desc: 'Sneha Patel — Class 12',     coins: -50,  balance: 150, date: 'Yesterday 1:45 PM'},
  { type: 'free',     desc: 'Rahul Singh — Free View (2)', coins: 0,   balance: 200, date: '3 days ago'       },
  { type: 'free',     desc: 'Anjali Sharma — Free View (1)', coins: 0, balance: 200, date: '3 days ago'       },
];
