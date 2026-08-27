import React from 'react';
import { MbbsBudgetCalculator } from './MbbsBudgetCalculator';

interface BudgetCalculatorProps {
  apiKey?: string;
  onApplyWithBudget?: (uniName: string, budgetInr: number) => void;
}

export const BudgetCalculator: React.FC<BudgetCalculatorProps> = ({ onApplyWithBudget }) => {
  return <MbbsBudgetCalculator onApplyWithBudget={onApplyWithBudget} />;
};
