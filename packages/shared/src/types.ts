export type { AdvanceTrigger, ElementFingerprint, ElementTarget, WalkthroughStep, Walkthrough, CreateWalkthroughInput, UpdateWalkthroughInput, ApiError } from './schemas.js';

export type SessionUser = {
  id: string;
  email: string;
};

export type PlayerProgress = {
  walkthroughId: string;
  currentStepIndex: number;
  origin: string;
  path: string;
  updatedAt: string;
};

export type ExtensionMessage =
  | { type: 'START_AUTHOR'; tabId?: number }
  | { type: 'STOP_AUTHOR' }
  | { type: 'START_PREVIEW'; walkthroughId: string }
  | { type: 'STOP_PREVIEW' }
  | { type: 'GET_TAB_INFO' }
  | { type: 'CAPTURE_STEP'; payload: { title: string; description: string; advanceTrigger: string } }
  | { type: 'AUTHOR_STATE_CHANGED'; payload: { isRecording: boolean; stepCount: number } }
  | { type: 'PREVIEW_STATE_CHANGED'; payload: { walkthroughId: string | null; stepIndex: number } }
  | { type: 'GET_PLAYER_PROGRESS'; walkthroughId: string }
  | { type: 'SAVE_PLAYER_PROGRESS'; payload: PlayerProgress };

export type TabInfo = {
  url: string;
  origin: string;
  path: string;
};
