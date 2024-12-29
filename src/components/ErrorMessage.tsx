// src/components/ErrorMessage.tsx
import React from "react";

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <p style={{ color: "red" }}>{message}</p>
);

