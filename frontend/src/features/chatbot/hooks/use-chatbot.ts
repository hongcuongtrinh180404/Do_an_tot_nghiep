'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { chatbotFailure, sendChatbotMessage } from '../api/chatbot.api';
import { CHATBOT_MESSAGE_LIMIT, type ChatbotTurn } from '../chatbot.contract';

/** Component-local, stateless requests. The owner keys this hook's component by account ID. */
export function useChatbot() {
  const [turns, setTurns] = useState<ChatbotTurn[]>([]);
  const [retryAt, setRetryAt] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const active = useRef<AbortController | null>(null);
  const cooldown = useRef(0);

  useEffect(() => () => {
    active.current?.abort();
    active.current = null;
  }, []);

  useEffect(() => {
    if (!retryAt) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setSecondsRemaining(seconds);
      if (!seconds) clearInterval(timer);
    };
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [retryAt]);

  const start = useCallback((text: string, retryId?: string): boolean => {
    const message = text.trim();
    if (!message || message.length > CHATBOT_MESSAGE_LIMIT || requiresLogin
      || active.current || cooldown.current > Date.now()) return false;

    const controller = new AbortController();
    active.current = controller;
    const id = retryId ?? crypto.randomUUID();
    const pending: ChatbotTurn = { id, message, status: 'pending' };
    setTurns((previous) => retryId
      ? previous.map((turn) => turn.id === retryId ? pending : turn)
      : [...previous, pending]);

    const applyCooldown = (until?: number) => {
      if (!until || until <= Date.now()) return;
      cooldown.current = until;
      setRetryAt(until);
      setSecondsRemaining(Math.ceil((until - Date.now()) / 1000));
    };
    void (async () => {
      try {
        const result = await sendChatbotMessage(message, controller.signal);
        if (controller.signal.aborted) return;
        applyCooldown(result.retryAt);
        setTurns((previous) => previous.map((turn) =>
          turn.id === id ? { id, message, status: 'success', reply: result.reply } : turn));
      } catch (error) {
        if (controller.signal.aborted) return;
        const failure = chatbotFailure(error);
        applyCooldown(failure.retryAt);
        if (failure.requiresLogin) {
          setRequiresLogin(true);
          setTurns([]);
        } else {
          setTurns((previous) => previous.map((turn) =>
            turn.id === id ? { id, message, status: 'error', error: failure } : turn));
        }
      } finally {
        if (active.current === controller) active.current = null;
      }
    })();
    return true;
  }, [requiresLogin]);

  return {
    turns,
    send: start,
    retry: (turn: ChatbotTurn) => turn.status === 'error' && turn.error.retryable
      ? start(turn.message, turn.id) : false,
    isPending: turns.some((turn) => turn.status === 'pending'),
    secondsRemaining,
    requiresLogin,
    clear: () => {
      active.current?.abort();
      active.current = null;
      setTurns([]);
      // Clearing the display does not reset the account's request quota.
    },
  };
}
