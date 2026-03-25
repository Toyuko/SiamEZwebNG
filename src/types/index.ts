// Re-export Prisma enums and extend with app types
import type {
  User as PrismaUser,
  Service as PrismaService,
  Case as PrismaCase,
  Quote as PrismaQuote,
  Payment as PrismaPayment,
  Document as PrismaDocument,
  Invoice as PrismaInvoice,
  CaseNote as PrismaCaseNote,
  StaffAssignment as PrismaStaffAssignment,
} from "@prisma/client";

export type { PrismaUser, PrismaService, PrismaCase, PrismaQuote, PrismaPayment, PrismaDocument, PrismaInvoice, PrismaCaseNote, PrismaStaffAssignment };

export type {
  UserRole,
  ServiceType,
  CaseStatus,
  QuoteStatus,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
} from "@prisma/client";

// App-level DTOs / view models
export interface ServiceWithPrice extends PrismaService {
  displayPrice?: string;
}

export interface CaseWithRelations extends PrismaCase {
  service?: PrismaService;
  user?: PrismaUser;
  quotes?: PrismaQuote[];
  payments?: PrismaPayment[];
  documents?: PrismaDocument[];
  staffAssignments?: (PrismaStaffAssignment & { user?: PrismaUser })[];
}
