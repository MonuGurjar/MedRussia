import { platformApi } from '../../lib/platformApi';
import { EligibilityInputDto, EligibilityReportResponse } from '../../types/platform';

export const platformEligibilityService = {
  async evaluateEligibility(input: EligibilityInputDto): Promise<EligibilityReportResponse> {
    return platformApi.request<EligibilityReportResponse>(
      '/api/v1/eligibility/evaluate',
      {
        method: 'POST',
        body: JSON.stringify(input)
      },
      false
    );
  }
};
