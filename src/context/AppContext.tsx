// ==========================================
// FitLune — Merkezi State Yönetimi (Context + Reducer)
// ==========================================

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction, ToastMessage } from '../types';
import { getTodayStr, generateId } from '../utils/helpers';
import { saveState, loadState } from '../utils/storage';

// Varsayılan state
const defaultState: AppState = {
    selectedDate: getTodayStr(),
    meals: [],
    waterLog: [],
    workouts: [],
    stepsLog: [],
    dailyTasks: [],
    userProfile: {
        name: 'Berkay',
        email: 'berkay@example.com',
        weight: 75,
        height: 178,
        age: 25,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'maintain',
        dailyCalorieGoal: 2200,
        dailyWaterGoal: 2.5,
        dailyBurnGoal: 600,
        isPro: true,
    },
    appSettings: {
        notificationsEnabled: true,
        waterReminder: true,
        mealReminder: false,
        darkMode: false,
    },
    toasts: [],
};

// LocalStorage'dan yükle, yoksa default kullan
function getInitialState(): AppState {
    const saved = loadState();
    if (saved) {
        return {
            ...defaultState,
            ...saved,
            workouts: saved.workouts || [],
            stepsLog: saved.stepsLog || [],
            selectedDate: getTodayStr(), // Her zaman bugünle başla
            toasts: [],
            userProfile: { ...defaultState.userProfile, ...saved.userProfile },
            appSettings: { ...defaultState.appSettings, ...saved.appSettings },
        };
    }
    return defaultState;
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_DATE':
            return { ...state, selectedDate: action.payload };

        case 'ADD_MEAL':
            return { ...state, meals: [...state.meals, action.payload] };

        case 'REMOVE_MEAL':
            return { ...state, meals: state.meals.filter(m => m.id !== action.payload) };

        case 'ADD_WATER': {
            const { date, amount } = action.payload;
            const existing = state.waterLog.find(w => w.date === date);
            if (existing) {
                return {
                    ...state,
                    waterLog: state.waterLog.map(w =>
                        w.date === date
                            ? { ...w, amount: Math.max(0, Number((w.amount + amount).toFixed(1))) }
                            : w
                    ),
                };
            }
            return {
                ...state,
                waterLog: [...state.waterLog, { date, amount: Math.max(0, Number(amount.toFixed(1))) }],
            };
        }

        case 'SET_WATER': {
            const { date, amount } = action.payload;
            const existing = state.waterLog.find(w => w.date === date);
            if (existing) {
                return {
                    ...state,
                    waterLog: state.waterLog.map(w =>
                        w.date === date ? { ...w, amount: Math.max(0, amount) } : w
                    ),
                };
            }
            return {
                ...state,
                waterLog: [...state.waterLog, { date, amount: Math.max(0, amount) }],
            };
        }

        case 'ADD_WORKOUT':
            return { ...state, workouts: [...state.workouts, action.payload] };

        case 'REMOVE_WORKOUT':
            return { ...state, workouts: state.workouts.filter(w => w.id !== action.payload) };

        case 'SET_STEPS': {
            const { date, count } = action.payload;
            const existing = state.stepsLog.find(s => s.date === date);
            if (existing) {
                return {
                    ...state,
                    stepsLog: state.stepsLog.map(s =>
                        s.date === date ? { ...s, count: Math.max(0, count) } : s
                    ),
                };
            }
            return {
                ...state,
                stepsLog: [...state.stepsLog, { date, count: Math.max(0, count) }],
            };
        }

        case 'UPDATE_PROFILE':
            return {
                ...state,
                userProfile: { ...state.userProfile, ...action.payload },
            };

        case 'UPDATE_SETTINGS':
            return {
                ...state,
                appSettings: { ...state.appSettings, ...action.payload },
            };

        case 'SET_WATER_GOAL':
            return {
                ...state,
                userProfile: { ...state.userProfile, dailyWaterGoal: action.payload },
            };

        case 'SET_CALORIE_GOAL':
            return {
                ...state,
                userProfile: { ...state.userProfile, dailyCalorieGoal: action.payload },
            };

        case 'ADD_TOAST':
            return { ...state, toasts: [...state.toasts, action.payload] };

        case 'REMOVE_TOAST':
            return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

        case 'TOGGLE_TASK': {
            const { id, date } = action.payload;
            return {
                ...state,
                dailyTasks: state.dailyTasks.map(t =>
                    t.id === id && t.date === date ? { ...t, done: !t.done } : t
                ),
            };
        }

        case 'SET_DAILY_TASKS':
            return { ...state, dailyTasks: action.payload };

        case 'RESET_APP':
            return { ...defaultState, selectedDate: getTodayStr(), toasts: [] };

        default:
            return state;
    }
}

// Context
interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

    // State değiştiğinde localStorage'a kaydet
    useEffect(() => {
        saveState(state);
    }, [state.meals, state.waterLog, state.workouts, state.stepsLog, state.userProfile, state.appSettings, state.dailyTasks]);

    // Karanlık mod (Dark Mode) değiştiğinde HTML sınıfını güncelle
    useEffect(() => {
        if (state.appSettings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [state.appSettings.darkMode]);

    // Toast helper
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = generateId();
        dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
        setTimeout(() => {
            dispatch({ type: 'REMOVE_TOAST', payload: id });
        }, 3000);
    };

    return (
        <AppContext.Provider value={{ state, dispatch, showToast }}>
            {children}
        </AppContext.Provider>
    );
}

// Hook
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}