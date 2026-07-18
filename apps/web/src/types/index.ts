export type UserRole = "community" | "security" | "leo" | "admin" | "super_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: "active" | "inactive" | "suspended";
  lastLogin?: string;
  createdAt: string;
}

export interface CaseItem {
  id: string;
  title: string;
  caseNumber: string;
  status: "active" | "closed" | "archived" | "under_review";
  priority: "critical" | "high" | "medium" | "low";
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  description: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  type: "image" | "video" | "document" | "audio" | "other";
  caseId: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "pending" | "verified" | "rejected";
  thumbnail?: string;
  fileSize?: string;
}

export interface Suspect {
  id: string;
  name: string;
  alias?: string;
  status: "wanted" | "investigating" | "arrested" | "cleared" | "deceased";
  riskLevel: "critical" | "high" | "medium" | "low";
  riskPercentage: number;
  image?: string;
  lastSeen?: string;
  charges?: string[];
  caseId?: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: string;
  timestamp: string;
  acknowledged: boolean;
  category: string;
}

export interface TimelineActivity {
  id: string;
  timestamp: string;
  action: string;
  description?: string;
  actor?: { name: string; role: string; avatar?: string };
  type: "creation" | "update" | "verification" | "alert" | "upload" | "note";
}

export interface Sighting {
  id: string;
  suspectId?: string;
  location: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: "pending" | "verified" | "dismissed";
  images?: string[];
}
