import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ChatbotController } from '../http/chatbot.controller.js';
import type { ChatbotMessageService } from '../http/chatbot-message.service.js';
import { RoleEnum } from 'share-lib';

describe('ChatbotController connection cleanup', () => {
  function setup() {
    const respond = vi.fn();
    const response = Object.assign(new EventEmitter(), {
      setHeader: vi.fn(),
      writableEnded: false,
      destroyed: false,
    });
    const controller = new ChatbotController({
      respond,
    } as unknown as ChatbotMessageService);
    const request = { aborted: false } as Request;
    return { controller, respond, request, response };
  }

  it('propagates disconnect and removes its close listener after completion', async () => {
    const { controller, respond, request, response } = setup();
    let signal: AbortSignal | undefined;
    let finish!: (value: unknown) => void;
    respond.mockImplementation((_message, _requestId, callerSignal) => {
      signal = callerSignal as AbortSignal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const result = controller.createMessage(
      { message: 'React' },
      request,
      response as unknown as Response,
      'account-a',
      RoleEnum.STUDENT,
    );
    expect(signal?.aborted).toBe(false);
    response.emit('close');
    expect(signal?.aborted).toBe(true);
    finish({ status: 'needs_clarification', answer: 'Làm rõ.' });
    await result;
    expect(response.listenerCount('close')).toBe(0);
  });

  it('cleans up on errors', async () => {
    const { controller, respond, request, response } = setup();
    respond.mockRejectedValue(new Error('safe test failure'));
    await expect(
      controller.createMessage(
        { message: 'React' },
        request,
        response as unknown as Response,
        'account-a',
        RoleEnum.STUDENT,
      ),
    ).rejects.toThrow('safe test failure');
    expect(response.listenerCount('close')).toBe(0);
  });

  it('does not abort on close when the response has finished normally', async () => {
    const { controller, respond, request, response } = setup();
    let finish!: (value: unknown) => void;
    let signal: AbortSignal | undefined;
    respond.mockImplementation((_message, _requestId, callerSignal) => {
      signal = callerSignal as AbortSignal;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const result = controller.createMessage(
      { message: 'React' },
      request,
      response as unknown as Response,
      'account-a',
      RoleEnum.STUDENT,
    );
    response.writableEnded = true;
    response.emit('close');
    expect(signal?.aborted).toBe(false);
    finish({ status: 'needs_clarification', answer: 'Làm rõ.' });
    await result;
    expect(response.listenerCount('close')).toBe(0);
  });

  it('aborts immediately if the socket was already closed', async () => {
    const { controller, respond, request, response } = setup();
    response.destroyed = true;
    respond.mockResolvedValue({
      status: 'needs_clarification',
      answer: 'Làm rõ.',
    });
    await controller.createMessage(
      { message: 'React' },
      request,
      response as unknown as Response,
      'account-a',
      RoleEnum.STUDENT,
    );
    expect((respond.mock.calls[0][2] as AbortSignal).aborted).toBe(true);
  });
});
