export type Priority = "low" | "medium" | "high";
export type Status = "pending" | "in-progress" | "completed";
export type Category =
  | "work"
  | "personal"
  | "study"
  | "fitness"
  | "shopping"
  | "other";

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO yyyy-mm-dd
  priority: Priority;
  category: Category;
  status: Status;
  createdAt: string;
}

export const PRIORITIES: Priority[] = ["low", "medium", "high"];
export const STATUSES: Status[] = ["pending", "in-progress", "completed"];
export const CATEGORIES: Category[] = [
  "work",
  "personal",
  "study",
  "fitness",
  "shopping",
  "other",
];

export const CATEGORY_LABEL: Record<Category, string> = {
  work: "Work",
  personal: "Personal",
  study: "Study",
  fitness: "Fitness",
  shopping: "Shopping",
  other: "Other",
};

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};