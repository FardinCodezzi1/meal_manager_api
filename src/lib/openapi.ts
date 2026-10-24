export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Mess Meal Manager API',
    version: '1.0.0',
    description:
      'Multi-User Mess Meal Manager Backend API built with Next.js App Router, Prisma ORM, Neon PostgreSQL, and JWT Authentication. Optimized for Web and Android WebViews (html2app).',
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token obtained from /api/auth/login or /api/auth/register',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Fardin Ahmed' },
          email: { type: 'string', format: 'email', example: 'fardin@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' },
          phone: { type: 'string', example: '+8801700000000' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'fardin@example.com' },
          password: { type: 'string', format: 'password', example: 'secret123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string' },
        },
      },
      MessCreateRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Green Valley Mess' },
        },
      },
      MessJoinRequest: {
        type: 'object',
        required: ['inviteCode'],
        properties: {
          inviteCode: { type: 'string', example: 'MESS-7X9K2' },
        },
      },
      MonthCreateRequest: {
        type: 'object',
        required: ['monthKey'],
        properties: {
          monthKey: { type: 'string', example: '2026-10' },
        },
      },
      MealUpdateRequest: {
        type: 'object',
        required: ['memberId', 'date'],
        properties: {
          memberId: { type: 'string' },
          date: { type: 'string', format: 'date', example: '2026-10-24' },
          lunch: { type: 'number', example: 1.0 },
          dinner: { type: 'number', example: 1.0 },
          isLeave: { type: 'boolean', example: false },
        },
      },
      LeaveRequestCreate: {
        type: 'object',
        required: ['startDate', 'endDate'],
        properties: {
          startDate: { type: 'string', format: 'date', example: '2026-10-25' },
          endDate: { type: 'string', format: 'date', example: '2026-10-28' },
          reason: { type: 'string', example: 'Going home for vacation' },
        },
      },
      StatusUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
        },
      },
      BazarCreateRequest: {
        type: 'object',
        required: ['amount', 'category'],
        properties: {
          monthKey: { type: 'string', example: '2026-10' },
          amount: { type: 'number', example: 450.5 },
          category: { type: 'string', example: 'Vegetables' },
          date: { type: 'string', format: 'date', example: '2026-10-24' },
          mode: { type: 'string', enum: ['QUICK', 'CHECKLIST'], example: 'QUICK' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Potatoes' },
                qty: { type: 'string', example: '2 kg' },
                price: { type: 'number', example: 120 },
                bought: { type: 'boolean', example: true },
              },
            },
          },
          notes: { type: 'string', example: 'Bought from local bazaar' },
        },
      },
      DepositCreateRequest: {
        type: 'object',
        required: ['memberId', 'amount'],
        properties: {
          monthKey: { type: 'string', example: '2026-10' },
          memberId: { type: 'string' },
          amount: { type: 'number', example: 3000 },
          date: { type: 'string', format: 'date', example: '2026-10-24' },
          notes: { type: 'string', example: 'First deposit' },
        },
      },
      NoteCreateRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', example: 'Personal Grocery Ideas' },
          content: { type: 'string', example: 'Eggs, oats, coffee' },
          isChecklist: { type: 'boolean', example: false },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                done: { type: 'boolean' },
              },
            },
          },
        },
      },
      ProfileUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Fardin Ahmed' },
          phone: { type: 'string', example: '+8801700000000' },
          email: { type: 'string', format: 'email', example: 'newemail@example.com' },
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', format: 'password' },
        },
      },
      AccountDeleteRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', format: 'password', example: 'secret123' },
        },
      },
      MessUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Sunshine Green Mess' },
          newManagerMemberId: { type: 'string', description: 'Member ID to transfer manager role' },
          regenerateInviteCode: { type: 'boolean', description: 'Regenerate fresh 6-char invite code' },
        },
      },
      MessDeleteRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', format: 'password', example: 'secret123' },
        },
      },
      AppConfig: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'global-config' },
          appName: { type: 'string', example: 'Mess Meal Manager' },
          appIconSvg: { type: 'string', nullable: true },
          creatorName: { type: 'string', example: 'Fardin Abu Ubaid' },
          creatorEmail: { type: 'string', example: 'fardin1.codezzi@gmail.com' },
          creatorPortfolio: { type: 'string', example: 'https://portfolio-fardin.vercel.app' },
          creatorBio: { type: 'string', example: 'Full-Stack Developer & Creator of Mess Meal Manager' },
          broadcastNotice: { type: 'string', nullable: true },
          noticeActive: { type: 'boolean', example: false },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AppConfigUpdateRequest: {
        type: 'object',
        properties: {
          appName: { type: 'string', example: 'Mess Meal Manager' },
          appIconSvg: { type: 'string' },
          creatorName: { type: 'string', example: 'Fardin Abu Ubaid' },
          creatorEmail: { type: 'string', example: 'fardin1.codezzi@gmail.com' },
          creatorPortfolio: { type: 'string', example: 'https://portfolio-fardin.vercel.app' },
          creatorBio: { type: 'string', example: 'Full-Stack Developer & Creator of Mess Meal Manager' },
          broadcastNotice: { type: 'string', example: 'Scheduled maintenance tonight at 2 AM UTC' },
          noticeActive: { type: 'boolean', example: true },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new user',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          201: { description: 'User registered successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Validation error or duplicate email' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile and active mess membership',
        responses: {
          200: { description: 'User profile with active membership' },
          401: { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Authentication'],
        summary: 'Update current user profile or password',
        description: 'Update name, phone, email, or password (requires currentPassword).',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfileUpdateRequest' } } },
        },
        responses: {
          200: { description: 'Profile updated successfully' },
          400: { description: 'Validation error or incorrect password' },
          401: { description: 'Unauthorized' },
        },
      },
      delete: {
        tags: ['Authentication'],
        summary: 'Delete or anonymize current user account',
        description: 'Requires password confirmation. Blocked if active manager with other members, or active member. Anonymizes account if historical mess records exist to maintain financial calculations.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AccountDeleteRequest' } } },
        },
        responses: {
          200: { description: 'Account deleted or anonymized' },
          400: { description: 'Cannot delete while in an active mess or active manager' },
          401: { description: 'Invalid password or unauthorized' },
        },
      },
    },
    '/api/mess': {
      get: {
        tags: ['Mess Management'],
        summary: 'Get active mess overview, members, and months',
        responses: {
          200: { description: 'Active mess details' },
          400: { description: 'Not in active mess' },
        },
      },
      put: {
        tags: ['Mess Management'],
        summary: 'Update mess name, transfer manager role, or regenerate invite code (Manager only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MessUpdateRequest' } } },
        },
        responses: {
          200: { description: 'Mess updated successfully' },
          400: { description: 'Bad request' },
          403: { description: 'Forbidden: Manager only' },
        },
      },
      delete: {
        tags: ['Mess Management'],
        summary: 'Delete mess (Manager only, when no other active members remain)',
        description: 'Requires manager password. Strictly blocked if other active members are present.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MessDeleteRequest' } } },
        },
        responses: {
          200: { description: 'Mess deleted successfully' },
          400: { description: 'Cannot delete while other active members exist' },
          401: { description: 'Invalid password' },
          403: { description: 'Forbidden: Manager only' },
        },
      },
    },
    '/api/mess/create': {
      post: {
        tags: ['Mess Management'],
        summary: 'Create a new mess',
        description: 'Creates a mess and makes current user the MANAGER. User must not already be in an active mess.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MessCreateRequest' } } },
        },
        responses: {
          201: { description: 'Mess created' },
          400: { description: 'User already in active mess or invalid input' },
        },
      },
    },
    '/api/mess/join': {
      post: {
        tags: ['Mess Management'],
        summary: 'Join mess via invite code',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MessJoinRequest' } } },
        },
        responses: {
          200: { description: 'Joined mess' },
          400: { description: 'Already in active mess' },
          404: { description: 'Mess not found' },
        },
      },
    },
    '/api/mess/leave': {
      post: {
        tags: ['Mess Management'],
        summary: 'Leave current mess',
        description: 'Sets status to LEFT and preserves all historical records.',
        responses: {
          200: { description: 'Left mess successfully' },
          400: { description: 'Not in active mess' },
        },
      },
    },
    '/api/mess/members': {
      get: {
        tags: ['Mess Management'],
        summary: 'List all mess members (ACTIVE and LEFT)',
        parameters: [
          { name: 'messId', in: 'query', schema: { type: 'string' }, description: 'Optional mess ID' },
        ],
        responses: {
          200: { description: 'List of members' },
        },
      },
    },
    '/api/mess/months': {
      get: {
        tags: ['Months Management'],
        summary: 'List months for the active mess',
        responses: {
          200: { description: 'List of months' },
        },
      },
      post: {
        tags: ['Months Management'],
        summary: 'Create a new month for active mess',
        description: 'Locks out future months (can only create current or previous months).',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MonthCreateRequest' } } },
        },
        responses: {
          201: { description: 'Month created' },
          400: { description: 'Future month lockout or invalid key' },
        },
      },
    },
    '/api/meals': {
      get: {
        tags: ['Meals & Leaves'],
        summary: 'Get daily meal records for month',
        parameters: [
          { name: 'monthKey', in: 'query', required: true, schema: { type: 'string', example: '2026-10' } },
        ],
        responses: {
          200: { description: 'Daily meal records grouped by date' },
        },
      },
    },
    '/api/meals/update': {
      post: {
        tags: ['Meals & Leaves'],
        summary: 'Upsert a daily meal record',
        description: 'Members can only update their own meals unless they are MANAGER. Date stored as start-of-day UTC.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MealUpdateRequest' } } },
        },
        responses: {
          200: { description: 'Meal record updated' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/meals/leave-request': {
      post: {
        tags: ['Meals & Leaves'],
        summary: 'Submit a leave request',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LeaveRequestCreate' } } },
        },
        responses: {
          201: { description: 'Leave request submitted' },
        },
      },
    },
    '/api/meals/leave-requests': {
      get: {
        tags: ['Meals & Leaves'],
        summary: 'List leave requests (All for manager, own for member)',
        responses: {
          200: { description: 'List of leave requests' },
        },
      },
    },
    '/api/meals/leave-requests/{id}': {
      patch: {
        tags: ['Meals & Leaves'],
        summary: 'Approve or reject leave request (Manager only)',
        description: 'If approved, bulk upserts DailyMeals for the range with lunch=0, dinner=0, isLeave=true.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusUpdateRequest' } } },
        },
        responses: {
          200: { description: 'Leave request updated' },
          403: { description: 'Forbidden: Manager only' },
        },
      },
    },
    '/api/bazar': {
      get: {
        tags: ['Bazar Management'],
        summary: 'Get all bazar entries for month',
        parameters: [
          { name: 'monthKey', in: 'query', required: true, schema: { type: 'string', example: '2026-10' } },
        ],
        responses: {
          200: { description: 'Bazar entries with counts and stats' },
        },
      },
      post: {
        tags: ['Bazar Management'],
        summary: 'Submit bazar entry (QUICK or CHECKLIST mode)',
        description: 'If submitted by MANAGER -> APPROVED. If submitted by MEMBER -> PENDING.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BazarCreateRequest' } } },
        },
        responses: {
          201: { description: 'Bazar entry created' },
        },
      },
    },
    '/api/bazar/{id}/approve': {
      patch: {
        tags: ['Bazar Management'],
        summary: 'Approve or reject bazar entry (Manager only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusUpdateRequest' } } },
        },
        responses: {
          200: { description: 'Bazar entry status updated' },
        },
      },
    },
    '/api/bazar/{id}': {
      put: {
        tags: ['Bazar Management'],
        summary: 'Edit existing bazar entry',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BazarCreateRequest' } } },
        },
        responses: {
          200: { description: 'Bazar entry updated' },
        },
      },
      delete: {
        tags: ['Bazar Management'],
        summary: 'Delete bazar entry',
        description: 'Manager can delete any; Member can only delete PENDING/DRAFT entries.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Bazar entry deleted' },
        },
      },
    },
    '/api/deposits': {
      get: {
        tags: ['Deposits'],
        summary: 'Get all deposits for month',
        parameters: [
          { name: 'monthKey', in: 'query', required: true, schema: { type: 'string', example: '2026-10' } },
        ],
        responses: {
          200: { description: 'List of deposits' },
        },
      },
      post: {
        tags: ['Deposits'],
        summary: 'Record member deposit (Manager only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DepositCreateRequest' } } },
        },
        responses: {
          201: { description: 'Deposit created' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/deposits/{id}': {
      put: {
        tags: ['Deposits'],
        summary: 'Edit deposit record (Manager only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DepositCreateRequest' } } },
        },
        responses: {
          200: { description: 'Deposit updated' },
        },
      },
      delete: {
        tags: ['Deposits'],
        summary: 'Delete deposit record (Manager only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Deposit deleted' },
        },
      },
    },
    '/api/summary': {
      get: {
        tags: ['Calculation Summary'],
        summary: 'Get calculated monthly financial summary and member balances',
        description: 'Calculates meal rate, balances, and excludes pending/rejected bazar entries.',
        parameters: [
          { name: 'monthKey', in: 'query', required: true, schema: { type: 'string', example: '2026-10' } },
        ],
        responses: {
          200: { description: 'Summary statistics and balances' },
        },
      },
    },
    '/api/notes': {
      get: {
        tags: ['Personal Notes'],
        summary: 'Get current user notes and checklists (user-scoped)',
        responses: {
          200: { description: 'User notes' },
        },
      },
      post: {
        tags: ['Personal Notes'],
        summary: 'Create personal note or checklist',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NoteCreateRequest' } } },
        },
        responses: {
          201: { description: 'Note created' },
        },
      },
    },
    '/api/notes/{id}': {
      put: {
        tags: ['Personal Notes'],
        summary: 'Update personal note or checklist',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NoteCreateRequest' } } },
        },
        responses: {
          200: { description: 'Note updated' },
        },
      },
      delete: {
        tags: ['Personal Notes'],
        summary: 'Delete personal note',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Note deleted' },
        },
      },
    },
    '/api/mess/export': {
      get: {
        tags: ['Cloud Import/Export'],
        summary: 'Export structured JSON of month data',
        parameters: [
          { name: 'monthKey', in: 'query', required: true, schema: { type: 'string', example: '2026-10' } },
        ],
        responses: {
          200: { description: 'Clean JSON export' },
        },
      },
    },
    '/api/mess/import': {
      post: {
        tags: ['Cloud Import/Export'],
        summary: 'Import data from JSON payload (Manager only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          200: { description: 'Import status and counts' },
        },
      },
    },
    '/api/config': {
      get: {
        tags: ['App Configuration'],
        summary: 'Get global app branding, creator profile, and broadcast notice',
        security: [],
        responses: {
          200: {
            description: 'App configuration payload',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AppConfig' } } },
          },
        },
      },
      put: {
        tags: ['App Configuration'],
        summary: 'Update global app branding, creator profile, or broadcast notice',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AppConfigUpdateRequest' } } },
        },
        responses: {
          200: { description: 'Config updated successfully' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/admin': {
      get: {
        tags: ['Super Admin'],
        summary: 'Get platform KPI statistics, user directory, and messes (Super Admin only)',
        responses: {
          200: { description: 'Platform statistics and directory' },
          403: { description: 'Forbidden: Super Admin access required' },
        },
      },
    },
    '/api/admin/messes/{id}': {
      delete: {
        tags: ['Super Admin'],
        summary: 'Delete test or abandoned mess (Super Admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Mess deleted' },
          403: { description: 'Forbidden: Super Admin access required' },
          404: { description: 'Mess not found' },
        },
      },
    },
  },
};
