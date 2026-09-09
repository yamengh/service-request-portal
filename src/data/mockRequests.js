const mockRequests = [
  {
    id: "REQ-001",
    title: "Computer not booting after weekend",
    description: "My desktop computer is not turning on after the weekend. I've checked the power cable and outlet, but there's no response when I press the power button. The monitor works fine with another computer.",
    category: "IT Support",
    priority: "High",
    status: "Pending",
    createdAt: "2026-08-15T09:30:00Z",
    updatedAt: "2026-08-15T09:30:00Z"
  },
  {
    id: "REQ-002",
    title: "Air conditioning not working in conference room",
    description: "The air conditioning unit in Conference Room B is not cooling properly. The temperature is uncomfortably warm during meetings, affecting productivity. This has been an issue for the past three days.",
    category: "Facilities",
    priority: "Medium",
    status: "In Progress",
    createdAt: "2026-08-18T14:15:00Z",
    updatedAt: "2026-08-20T10:00:00Z"
  },
  {
    id: "REQ-003",
    title: "Request for VPN access for remote work",
    description: "I need VPN access to work remotely starting next week. My manager has approved this request. Please provide the necessary credentials and installation instructions.",
    category: "IT Support",
    priority: "Medium",
    status: "Completed",
    createdAt: "2026-08-10T11:00:00Z",
    updatedAt: "2026-08-12T16:30:00Z"
  },
  {
    id: "REQ-004",
    title: "Printer jamming frequently on third floor",
    description: "The network printer on the third floor near the break room has been jamming frequently. It happens at least twice a day and requires manual intervention to clear the paper jams.",
    category: "Facilities",
    priority: "Low",
    status: "Pending",
    createdAt: "2026-08-22T08:45:00Z",
    updatedAt: "2026-08-22T08:45:00Z"
  },
  {
    id: "REQ-005",
    title: "Payroll deduction error for August",
    description: "I noticed an error in my August payroll deduction. The health insurance premium was deducted twice. Please review and correct this for the next payroll cycle.",
    category: "Finance",
    priority: "High",
    status: "In Progress",
    createdAt: "2026-08-25T13:20:00Z",
    updatedAt: "2026-08-26T09:15:00Z"
  },
  {
    id: "REQ-006",
    title: "Need additional monitor for dual display setup",
    description: "I would like to request an additional monitor to set up a dual display configuration. This would significantly improve my productivity for data analysis tasks that require referencing multiple documents simultaneously.",
    category: "IT Support",
    priority: "Low",
    status: "Pending",
    createdAt: "2026-08-28T10:30:00Z",
    updatedAt: "2026-08-28T10:30:00Z"
  },
  {
    id: "REQ-007",
    title: "Office door lock malfunctioning",
    description: "The electronic door lock for office 304 is not responding consistently. Sometimes it takes multiple attempts to unlock the door with my key card. This is causing delays and inconvenience.",
    category: "Facilities",
    priority: "Medium",
    status: "In Progress",
    createdAt: "2026-08-20T15:00:00Z",
    updatedAt: "2026-08-23T11:45:00Z"
  },
  {
    id: "REQ-008",
    title: "Question about vacation policy for new employees",
    description: "As a new employee, I have some questions about the vacation accrual policy. Specifically, I'd like to know when I become eligible to use my accrued vacation days and what the rollover policy is.",
    category: "HR",
    priority: "Low",
    status: "Completed",
    createdAt: "2026-08-05T09:00:00Z",
    updatedAt: "2026-08-06T14:20:00Z"
  },
  {
    id: "REQ-009",
    title: "Software license renewal for design tools",
    description: "The Adobe Creative Cloud licenses for the design team are due for renewal next month. Please initiate the renewal process to ensure uninterrupted access to essential design software.",
    category: "IT Support",
    priority: "High",
    status: "Pending",
    createdAt: "2026-08-29T16:00:00Z",
    updatedAt: "2026-08-29T16:00:00Z"
  },
  {
    id: "REQ-010",
    title: "Request for ergonomic chair assessment",
    description: "I'm experiencing back pain from my current office chair. I would like to request an ergonomic assessment and potentially a new chair that provides better lumbar support. I have a doctor's note recommending this.",
    category: "HR",
    priority: "Medium",
    status: "In Progress",
    createdAt: "2026-08-24T11:30:00Z",
    updatedAt: "2026-08-27T14:00:00Z"
  },
  {
    id: "REQ-011",
    title: "Network connectivity issues in marketing department",
    description: "The marketing department has been experiencing intermittent network connectivity issues over the past week. Internet connection drops randomly throughout the day, disrupting our workflow.",
    category: "IT Support",
    priority: "Urgent",
    status: "In Progress",
    createdAt: "2026-08-27T09:00:00Z",
    updatedAt: "2026-08-28T08:30:00Z"
  },
  {
    id: "REQ-012",
    title: "Expense report reimbursement delay",
    description: "I submitted an expense report for client travel expenses three weeks ago and haven't received reimbursement yet. The report was for the Chicago client visit in late July. Please check on the status.",
    category: "Finance",
    priority: "Medium",
    status: "Pending",
    createdAt: "2026-08-30T12:15:00Z",
    updatedAt: "2026-08-30T12:15:00Z"
  },
  {
    id: "REQ-013",
    title: "Keyboard replacement needed",
    description: "My keyboard has several keys that are not responding consistently, particularly the 'E', 'R', and 'T' keys. This is significantly impacting my typing speed and accuracy. I need a replacement.",
    category: "IT Support",
    priority: "Low",
    status: "Completed",
    createdAt: "2026-08-12T10:00:00Z",
    updatedAt: "2026-08-13T15:45:00Z"
  },
  {
    id: "REQ-014",
    title: "Conference room booking system not working",
    description: "The online conference room booking system is not allowing me to book rooms for next week. I keep getting an error message when trying to confirm the booking. This is affecting our meeting planning.",
    category: "IT Support",
    priority: "Medium",
    status: "Pending",
    createdAt: "2026-08-31T08:00:00Z",
    updatedAt: "2026-08-31T08:00:00Z"
  },
  {
    id: "REQ-015",
    title: "Lighting flickering in open office area",
    description: "The overhead fluorescent lights in the open office area on the second floor have been flickering noticeably for the past two days. This is causing eye strain and headaches for several team members.",
    category: "Facilities",
    priority: "Medium",
    status: "In Progress",
    createdAt: "2026-08-29T14:30:00Z",
    updatedAt: "2026-08-30T10:00:00Z"
  }
];

export default mockRequests;
