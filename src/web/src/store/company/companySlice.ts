// External imports - @reduxjs/toolkit v1.9.5
import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';

// Internal imports
import { Company, CompanyProfile, RevenueRange } from '../../types/company.types';
import { ApiService } from '../../services/api.service';
import { ApiError } from '../../types/api.types';

// Constants
const COMPANY_ENDPOINT = '/api/v1/companies';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// State interface
interface CompanyState {
  data: Company | null;
  loading: boolean;
  error: ApiError | null;
  lastUpdated: number | null;
}

// Initial state
const initialState: CompanyState = {
  data: null,
  loading: false,
  error: null,
  lastUpdated: null
};

// Async thunks
export const fetchCompanyProfile = createAsyncThunk<Company, string>(
  'company/fetchProfile',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await ApiService.getInstance().get<Company>(
        `${COMPANY_ENDPOINT}/${companyId}`
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  },
  {
    condition: (companyId, { getState }) => {
      const state = getState() as { company: CompanyState };
      const { loading, lastUpdated } = state.company;
      
      // Prevent duplicate requests
      if (loading) return false;
      
      // Check cache validity
      if (lastUpdated && Date.now() - lastUpdated < CACHE_DURATION) {
        return false;
      }
      
      return true;
    }
  }
);

export const updateCompanyProfile = createAsyncThunk<Company, CompanyProfile>(
  'company/updateProfile',
  async (profileData: CompanyProfile, { getState, rejectWithValue }) => {
    const state = getState() as { company: CompanyState };
    const companyId = state.company.data?.id;
    
    if (!companyId) {
      return rejectWithValue({ 
        code: 'INVALID_STATE',
        message: 'No company ID available for update',
        details: {},
        validationErrors: [],
        stack: ''
      } as ApiError);
    }

    try {
      const response = await ApiService.getInstance().put<CompanyProfile, Company>(
        `${COMPANY_ENDPOINT}/${companyId}`,
        profileData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error as ApiError);
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as { company: CompanyState };
      return !state.company.loading;
    }
  }
);

// Slice definition
const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    clearCompanyError: (state) => {
      state.error = null;
    },
    resetCompanyState: () => initialState
  },
  extraReducers: (builder) => {
    builder
      // Fetch company profile cases
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
      })
      // Update company profile cases
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
        state.error = null;
        state.lastUpdated = Date.now();
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as ApiError;
      });
  }
});

// Actions
export const { clearCompanyError, resetCompanyState } = companySlice.actions;

// Selectors
const selectCompanyState = (state: { company: CompanyState }) => state.company;

export const selectCompanyProfile = createSelector(
  [selectCompanyState],
  (companyState) => companyState.data
);

export const selectCompanyLoading = createSelector(
  [selectCompanyState],
  (companyState) => companyState.loading
);

export const selectCompanyError = createSelector(
  [selectCompanyState],
  (companyState) => companyState.error
);

export const selectCompanyRevenueRange = createSelector(
  [selectCompanyState],
  (companyState) => companyState.data?.revenueRange ?? RevenueRange.LESS_THAN_1M
);

export const selectCompanyLastUpdated = createSelector(
  [selectCompanyState],
  (companyState) => companyState.lastUpdated
);

// Default export
export default companySlice.reducer;