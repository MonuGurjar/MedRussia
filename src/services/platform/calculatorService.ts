import { platformApi } from '../../lib/platformApi';
import { BudgetEstimateRequest, BudgetEstimateResponse } from '../../types/platform';

export const platformCalculatorService = {
  async estimateBudget(params: BudgetEstimateRequest): Promise<BudgetEstimateResponse> {
    return platformApi.request<BudgetEstimateResponse>(
      '/api/v1/calculator/estimate',
      {
        method: 'POST',
        body: JSON.stringify(params)
      },
      false
    );
  }
};
