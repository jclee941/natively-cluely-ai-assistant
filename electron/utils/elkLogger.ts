/**
 * ELK Logger - sends errors and events to Elasticsearch for remote debugging
 * Index: natively-errors (errors/warnings)
 * Index: natively-events (LLM calls, STT events, model switches)
 */

import axios from 'axios';
import os from 'os';

const ELK_URL = 'http://192.168.50.105:9200'
const ELK_AUTH = 'Basic ' + Buffer.from('elastic:I93bmZ/uT3haNpdL9GJ+neTf').toString('base64');
const ERROR_INDEX = 'natively-errors';
const EVENT_INDEX = 'natively-events';
const ENABLED = true; // kill switch

interface ErrorDoc {
  level: 'error' | 'warn' | 'info';
  component: string;
  message: string;
  error_type?: string;
  stack_trace?: string;
  context?: Record<string, any>;
  model?: string;
  proxy_url?: string;
}

interface EventDoc {
  event_type: string;
  component: string;
  message: string;
  duration_ms?: number;
  model?: string;
  question?: string;
  answer_length?: number;
}

async function send(index: string, doc: Record<string, any>): Promise<void> {
  if (!ENABLED) return;
  try {
    await axios.post(`${ELK_URL}/${index}/_doc`, {
      ...doc,
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
    }, {
      timeout: 3000,
      headers: { 'Content-Type': 'application/json', 'Authorization': ELK_AUTH },
    });
  } catch {
    // silently fail - don't crash app for logging
  }
}

export function logError(doc: ErrorDoc): void {
  send(ERROR_INDEX, doc);
}

export function logEvent(doc: EventDoc): void {
  send(EVENT_INDEX, doc);
}

// Convenience methods
export const elk = {
  error: (component: string, message: string, error?: any, context?: Record<string, any>) => {
    logError({
      level: 'error',
      component,
      message,
      error_type: error?.constructor?.name || 'Unknown',
      stack_trace: error?.stack?.substring(0, 2000) || '',
      context,
    });
  },

  warn: (component: string, message: string, context?: Record<string, any>) => {
    logError({
      level: 'warn',
      component,
      message,
      context,
    });
  },

  llmCall: (model: string, question: string, answerLength: number, durationMs: number) => {
    logEvent({
      event_type: 'llm_call',
      component: 'LLMHelper',
      message: `LLM call: ${model}`,
      model,
      question: question.substring(0, 500),
      answer_length: answerLength,
      duration_ms: durationMs,
    });
  },

  sttEvent: (component: string, message: string, context?: Record<string, any>) => {
    logEvent({
      event_type: 'stt',
      component,
      message,
      ...context,
    });
  },

  modelSwitch: (from: string, to: string) => {
    logEvent({
      event_type: 'model_switch',
      component: 'LLMHelper',
      message: `Model switch: ${from} -> ${to}`,
      model: to,
    });
  },

  proxyError: (url: string, status: number, message: string) => {
    logError({
      level: 'error',
      component: 'ProxyClient',
      message: `Proxy error ${status}: ${message}`,
      error_type: `HTTP_${status}`,
      proxy_url: url,
    });
  },

  startup: () => {
    logEvent({
      event_type: 'startup',
      component: 'Main',
      message: `Natively started on ${os.hostname()} (${os.platform()} ${os.release()})`,
    });
  },
};
