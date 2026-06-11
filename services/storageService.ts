
import { Runner, Sponsor, Expense, Organizer, ExtraRevenue } from '../types';

const RUNNERS_KEY = 'runtrack_5k_data';
const SPONSORS_KEY = 'runtrack_5k_sponsors';
const EXPENSES_KEY = 'runtrack_5k_expenses';
const ORGANIZERS_KEY = 'runtrack_5k_organizers';
const EXTRA_REVENUE_KEY = 'runtrack_5k_extra_revenue';

// --- Runners ---

export const getRunners = (): Runner[] => {
  try {
    const data = localStorage.getItem(RUNNERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load runners", e);
    return [];
  }
};

export const saveRunner = (runner: Runner): void => {
  const runners = getRunners();
  runners.push(runner);
  localStorage.setItem(RUNNERS_KEY, JSON.stringify(runners));
};

export const updateRunner = (updatedRunner: Runner): void => {
  const runners = getRunners();
  const index = runners.findIndex(r => r.id === updatedRunner.id);
  if (index !== -1) {
    runners[index] = updatedRunner;
    localStorage.setItem(RUNNERS_KEY, JSON.stringify(runners));
  }
};

export const deleteRunner = (id: string): void => {
  const runners = getRunners();
  const filtered = runners.filter(r => r.id !== id);
  localStorage.setItem(RUNNERS_KEY, JSON.stringify(filtered));
};

// --- Sponsors ---

export const getSponsors = (): Sponsor[] => {
  try {
    const data = localStorage.getItem(SPONSORS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load sponsors", e);
    return [];
  }
};

export const saveSponsor = (sponsor: Sponsor): void => {
  const sponsors = getSponsors();
  sponsors.push(sponsor);
  localStorage.setItem(SPONSORS_KEY, JSON.stringify(sponsors));
};

export const updateSponsor = (updatedSponsor: Sponsor): void => {
  const sponsors = getSponsors();
  const index = sponsors.findIndex(s => s.id === updatedSponsor.id);
  if (index !== -1) {
    sponsors[index] = updatedSponsor;
    localStorage.setItem(SPONSORS_KEY, JSON.stringify(sponsors));
  }
};

export const deleteSponsor = (id: string): void => {
  const sponsors = getSponsors();
  const filtered = sponsors.filter(s => s.id !== id);
  localStorage.setItem(SPONSORS_KEY, JSON.stringify(filtered));
};

// --- Expenses ---

export const getExpenses = (): Expense[] => {
  try {
    const data = localStorage.getItem(EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load expenses", e);
    return [];
  }
};

export const saveExpense = (expense: Expense): void => {
  const expenses = getExpenses();
  expenses.push(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
};

export const deleteExpense = (id: string): void => {
  const expenses = getExpenses();
  const filtered = expenses.filter(e => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(filtered));
};

// --- Extra Revenue ---

export const getExtraRevenues = (): ExtraRevenue[] => {
  try {
    const data = localStorage.getItem(EXTRA_REVENUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load extra revenues", e);
    return [];
  }
};

export const saveExtraRevenue = (revenue: ExtraRevenue): void => {
  const revenues = getExtraRevenues();
  revenues.push(revenue);
  localStorage.setItem(EXTRA_REVENUE_KEY, JSON.stringify(revenues));
};

export const deleteExtraRevenue = (id: string): void => {
  const revenues = getExtraRevenues();
  const filtered = revenues.filter(r => r.id !== id);
  localStorage.setItem(EXTRA_REVENUE_KEY, JSON.stringify(filtered));
};

// --- Organizers ---

export const getOrganizers = (): Organizer[] => {
  try {
    const data = localStorage.getItem(ORGANIZERS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Seed default organizer if none exists (Legacy support)
    const defaultOrganizer: Organizer = {
       id: 'default-1',
       name: 'Diego',
       teamName: 'Luso',
       username: 'diego',
       password: '123'
    };
    localStorage.setItem(ORGANIZERS_KEY, JSON.stringify([defaultOrganizer]));
    return [defaultOrganizer];
  } catch (e) {
    console.error("Failed to load organizers", e);
    return [];
  }
};

export const saveOrganizer = (organizer: Organizer): void => {
  const organizers = getOrganizers();
  organizers.push(organizer);
  localStorage.setItem(ORGANIZERS_KEY, JSON.stringify(organizers));
};

export const updateOrganizer = (updatedOrganizer: Organizer): void => {
  const organizers = getOrganizers();
  const index = organizers.findIndex(o => o.id === updatedOrganizer.id);
  if (index !== -1) {
    organizers[index] = updatedOrganizer;
    localStorage.setItem(ORGANIZERS_KEY, JSON.stringify(organizers));
  }
};

export const deleteOrganizer = (id: string): void => {
  const organizers = getOrganizers();
  const filtered = organizers.filter(o => o.id !== id);
  localStorage.setItem(ORGANIZERS_KEY, JSON.stringify(filtered));
};


export const clearAllData = (): void => {
  localStorage.removeItem(RUNNERS_KEY);
  localStorage.removeItem(SPONSORS_KEY);
  localStorage.removeItem(EXPENSES_KEY);
  localStorage.removeItem(ORGANIZERS_KEY);
  localStorage.removeItem(EXTRA_REVENUE_KEY);
};
