export const validateTitle = (title) => {
  if (!title || title.trim().length === 0) return "Title is required";
  if (title.length < 5) return "Title must be at least 5 characters";
  if (title.length > 100) return "Title must not exceed 100 characters";
  return null;
};

export const validateDescription = (description) => {
  if (!description || description.trim().length === 0) return "Description is required";
  if (description.length < 20) return "Description must be at least 20 characters";
  if (description.length > 1000) return "Description must not exceed 1000 characters";
  return null;
};

export const validateCategory = (category) => {
  const validCategories = ["IT Support", "Facilities", "HR", "Finance", "Other"];
  if (!category) return "Category is required";
  if (!validCategories.includes(category)) return "Invalid category";
  return null;
};

export const validatePriority = (priority) => {
  const validPriorities = ["Low", "Medium", "High", "Urgent"];
  if (!priority) return "Priority is required";
  if (!validPriorities.includes(priority)) return "Invalid priority";
  return null;
};

export const validateForm = (formData) => {
  const errors = {
    title: validateTitle(formData.title),
    description: validateDescription(formData.description),
    category: validateCategory(formData.category),
    priority: validatePriority(formData.priority),
  };
  const isValid = Object.values(errors).every(error => error === null);
  return { errors, isValid };
};
