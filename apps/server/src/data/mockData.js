export const mockTutors = [
  {
    id: 1,
    name: 'Chileshe M.',
    courseCode: 'CS201',
    department: 'School of Natural Sciences',
    rating: 4.9,
    availability: 'Mon, Wed, Fri',
    bio: 'Helps students with algorithms, databases, and exam revision.'
  },
  {
    id: 2,
    name: 'Kabwe H.',
    courseCode: 'EE232',
    department: 'School of Engineering',
    rating: 4.7,
    availability: 'Tue, Thu',
    bio: 'Focuses on circuit analysis, electronics, and practical problem solving.'
  },
  {
    id: 3,
    name: 'Mweemba T.',
    courseCode: 'HIS110',
    department: 'School of Humanities and Social Sciences',
    rating: 4.8,
    availability: 'Daily',
    bio: 'Supports essay writing, research methods, and discussion-based study groups.'
  },
  {
    id: 4,
    name: 'Demo Tutor Leya M.',
    courseCode: 'MATH115',
    department: 'School of Natural Sciences',
    rating: 4.6,
    availability: 'Mon, Thu',
    bio: 'Fictional demo tutor for introductory algebra and calculus practice.'
  },
  {
    id: 5,
    name: 'Demo Tutor Bwalya K.',
    courseCode: 'BIO110',
    department: 'School of Natural Sciences',
    rating: 4.8,
    availability: 'Tue, Fri',
    bio: 'Fictional demo tutor for cell biology and study skills.'
  },
  {
    id: 6,
    name: 'Demo Tutor Tandiwe P.',
    courseCode: 'ECON101',
    department: 'School of Humanities and Social Sciences',
    rating: 4.7,
    availability: 'Wed, Sat',
    bio: 'Fictional demo tutor for economics fundamentals and problem solving.'
  },
  {
    id: 7,
    name: 'Demo Tutor Lackson C.',
    courseCode: 'ENGR210',
    department: 'School of Engineering',
    rating: 4.5,
    availability: 'Mon, Wed',
    bio: 'Fictional demo tutor for engineering mechanics and worked examples.'
  },
  {
    id: 8,
    name: 'Demo Tutor Nasilele R.',
    courseCode: 'ENGL120',
    department: 'School of Humanities and Social Sciences',
    rating: 4.9,
    availability: 'Tue, Thu',
    bio: 'Fictional demo tutor for academic writing and literature discussion.'
  }
];

export const mockGroups = [
  {
    id: 1,
    name: 'CS201 Data Structures Group',
    courseCode: 'CS201',
    department: 'School of Natural Sciences',
    members: 18,
    nextSession: 'Today, 18:00'
  },
  {
    id: 2,
    name: 'Engineering Problem Solving Circle',
    courseCode: 'EE232',
    department: 'School of Engineering',
    members: 12,
    nextSession: 'Tomorrow, 17:00'
  },
  {
    id: 3,
    name: 'Calculus Practice Circle',
    courseCode: 'MATH115',
    department: 'School of Natural Sciences',
    members: 8,
    nextSession: 'Wednesday, 16:00'
  },
  {
    id: 4,
    name: 'Biology Revision Partners',
    courseCode: 'BIO110',
    department: 'School of Natural Sciences',
    members: 6,
    nextSession: 'Friday, 14:00'
  },
  {
    id: 5,
    name: 'Economics Study Table',
    courseCode: 'ECON101',
    department: 'School of Humanities and Social Sciences',
    members: 10,
    nextSession: 'Thursday, 17:30'
  },
  {
    id: 6,
    name: 'Academic Writing Workshop',
    courseCode: 'ENGL120',
    department: 'School of Humanities and Social Sciences',
    members: 7,
    nextSession: 'Saturday, 10:00'
  }
];

export const mockCourseResources = [
  {
    id: 1,
    title: 'Data Structures Revision Sheet',
    courseCode: 'CS201',
    resourceType: 'Study notes',
    description: 'A concise review of arrays, linked lists, stacks, queues, and tree traversal.',
    source: 'Original peer-learning material',
    downloadName: 'CS201-data-structures-revision.txt',
    content: `CS201 | DATA STRUCTURES REVISION SHEET\n\nARRAYS\nElements are stored in contiguous positions. Index access is O(1); insertion or deletion in the middle is O(n) because later elements shift.\n\nLINKED LISTS\nEach node stores a value and a reference to the next node. Insertion at a known position is O(1), but searching for a value is O(n).\n\nSTACKS AND QUEUES\nA stack is last-in, first-out (LIFO): push and pop. A queue is first-in, first-out (FIFO): enqueue and dequeue.\n\nBINARY SEARCH TREES\nFor each node, values in the left subtree are smaller and values in the right subtree are larger. Search is O(log n) on average in a balanced tree and O(n) in a skewed tree.\n\nTRAVERSALS\nInorder: left, node, right. Preorder: node, left, right. Postorder: left, right, node.\n\nUse these notes for revision and check your course materials for the full syllabus.`,
  },
  {
    id: 2,
    title: 'Circuit Analysis Formula Notes',
    courseCode: 'EE232',
    resourceType: 'Formula sheet',
    description: 'Key relationships for Ohm\'s law, series and parallel circuits, and Kirchhoff\'s laws.',
    source: 'Original peer-learning material',
    downloadName: 'EE232-circuit-analysis-notes.txt',
    content: `EE232 | CIRCUIT ANALYSIS FORMULA NOTES\n\nOHM'S LAW\nV = I R, where voltage V is in volts, current I is in amperes, and resistance R is in ohms.\n\nSERIES RESISTORS\nR_total = R1 + R2 + ... + Rn. The same current passes through every component.\n\nPARALLEL RESISTORS\n1 / R_total = 1 / R1 + 1 / R2 + ... + 1 / Rn. The voltage across each branch is the same.\n\nKIRCHHOFF'S CURRENT LAW\nThe total current entering a junction equals the total current leaving it.\n\nKIRCHHOFF'S VOLTAGE LAW\nThe algebraic sum of voltage changes around a closed loop is zero.\n\nAlways include units and state the direction you chose for current in worked problems.`,
  },
  {
    id: 3,
    title: 'Calculus Limits Practice Guide',
    courseCode: 'MATH115',
    resourceType: 'Study guide',
    description: 'A short guide to substitution, factoring, and common limit checks.',
    source: 'Original peer-learning material',
    downloadName: 'MATH115-limits-practice-guide.txt',
    content: `MATH115 | LIMITS PRACTICE GUIDE\n\nSTART WITH DIRECT SUBSTITUTION\nSubstitute the value into the function. If the result is defined, it is the limit.\n\nWHEN YOU GET 0/0\nFactor and simplify before substituting again. For example, (x^2 - 1)/(x - 1) simplifies to x + 1 when x is not 1. Its limit as x approaches 1 is 2.\n\nCHECK ONE-SIDED LIMITS\nA two-sided limit exists only when the left-hand and right-hand limits agree.\n\nCONTINUITY CHECK\nA function is continuous at a point when its value is defined there, the limit exists, and both values are equal.\n\nPractice showing each algebra step; cancelling a factor does not change the limit around the point, even if the original expression was undefined at that point.`,
  },
];

export const mockPracticeQuizzes = [
  {
    id: 1,
    title: 'Data Structures Check-in',
    courseCode: 'CS201',
    description: 'Test your understanding of common data structures and their operations.',
    questions: [
      { prompt: 'Which structure follows last-in, first-out order?', options: ['Queue', 'Stack', 'Binary search tree'], correctIndex: 1, explanation: 'A stack removes the most recently added item first.' },
      { prompt: 'What is the time complexity of accessing an array element by index?', options: ['O(1)', 'O(n)', 'O(log n)'], correctIndex: 0, explanation: 'Arrays support direct index access in constant time.' },
      { prompt: 'Which traversal visits a node between its left and right subtrees?', options: ['Preorder', 'Postorder', 'Inorder'], correctIndex: 2, explanation: 'Inorder traversal visits left subtree, node, then right subtree.' },
    ],
  },
  {
    id: 2,
    title: 'Circuit Fundamentals',
    courseCode: 'EE232',
    description: 'A quick self-check on basic circuit laws.',
    questions: [
      { prompt: 'Which equation expresses Ohm\'s law?', options: ['V = I R', 'P = V / I', 'R = V + I'], correctIndex: 0, explanation: 'Ohm\'s law relates voltage, current, and resistance as V = I R.' },
      { prompt: 'In a series circuit, what is the same through each component?', options: ['Voltage', 'Current', 'Resistance'], correctIndex: 1, explanation: 'The same current flows through each component in a series path.' },
      { prompt: 'Kirchhoff\'s current law applies at a:', options: ['Closed loop', 'Junction', 'Resistor only'], correctIndex: 1, explanation: 'At a junction, total current entering equals total current leaving.' },
    ],
  },
  {
    id: 3,
    title: 'Limits and Continuity',
    courseCode: 'MATH115',
    description: 'Practice choosing the right first step for evaluating limits.',
    questions: [
      { prompt: 'What should you try first when evaluating a limit?', options: ['Differentiate immediately', 'Direct substitution', 'Expand every term'], correctIndex: 1, explanation: 'Direct substitution is the simplest first check.' },
      { prompt: 'If direct substitution gives 0/0, what is a useful next step?', options: ['Factor and simplify', 'Declare the limit zero', 'Ignore the denominator'], correctIndex: 0, explanation: 'Factoring may reveal a common factor that can be simplified.' },
      { prompt: 'When does a two-sided limit exist?', options: ['When both one-sided limits agree', 'When the function is always positive', 'When the function value is zero'], correctIndex: 0, explanation: 'The left- and right-hand limits must agree.' },
    ],
  },
];

export const mockSessions = [
  {
    id: 1,
    tutorId: 1,
    studentName: 'Alice',
    courseCode: 'CS201',
    date: '2026-09-15T18:00:00.000Z',
    status: 'confirmed',
    notes: 'Prepare for the quiz on arrays and graphs.'
  }
];

export const mockUsers = [
  {
    id: 1,
    name: 'Alice Banda',
    email: 'alice@unza.zm',
    password: 'password123',
    role: 'student',
    department: 'School of Natural Sciences',
    programOfStudy: 'Computer Science',
    studentNumber: 'DEMO-0001'
  },
  {
    id: 2,
    name: 'Chileshe M.',
    email: 'chileshe@unza.zm',
    password: 'password123',
    role: 'tutor',
    department: 'School of Natural Sciences',
    programOfStudy: 'Computer Science',
    studentNumber: ''
  }
];

export const mockMessages = [
  {
    id: 1,
    sender: 'Alice Banda',
    receiver: 'Chileshe M.',
    content: 'Can I book a session for CS201 this week?',
    sentAt: '2026-09-12T10:30:00.000Z'
  },
  {
    id: 2,
    sender: 'Chileshe M.',
    receiver: 'Alice Banda',
    content: 'Yes, I am available on Wednesday evening.',
    sentAt: '2026-09-12T10:32:00.000Z'
  }
];
