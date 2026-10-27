'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { LIVE_PREVIEW_MOCK_DATA, type ILivePreviewBreakpoint } from './mock-discovery-data';

export function PublicHero(): React.JSX.Element {
  const [activeBreakpointIndex, setActiveBreakpointIndex] = useState<number>(1);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const activeBreakpoint: ILivePreviewBreakpoint =
    LIVE_PREVIEW_MOCK_DATA.breakpoints[activeBreakpointIndex] ??
    LIVE_PREVIEW_MOCK_DATA.breakpoints[0];

  const handleSelectBreakpoint = (index: number): void => {
    setActiveBreakpointIndex(index);
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
  };

  const handleOptionClick = (optionIndex: number): void => {
    if (!quizSubmitted) {
      setSelectedQuizOption(optionIndex);
    }
  };

  const handleCheckAnswer = (): void => {
    if (selectedQuizOption !== null) {
      setQuizSubmitted(true);
    }
  };

  const handleResetQuiz = (): void => {
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
  };

  return (
    <section className="w-full bg-background py-12 lg:py-16">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-6 flex flex-col items-start space-y-6 taste-enter">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#161616] leading-[1.15]">
              Khám phá tri thức với video tương tác và AI
            </h1>

            <p className="text-base sm:text-lg text-[#161616] leading-relaxed max-w-xl">
              Học trực tuyến với video tương tác, tự động đồng bộ Mindmap và In-video Quiz thông minh.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto">
              <Link
                href="#featured"
                className={buttonVariants({
                  size: 'lg',
                  className: 'bg-[#313131] text-white hover:bg-[#202020] font-bold px-6 shadow-none text-base transition-colors',
                })}
              >
                Khám phá khóa học ngay
                <Icon icon="lucide:arrow-right" className="size-4 ml-2" />
              </Link>
              <Link
                href="#ai-experience"
                className={buttonVariants({
                  variant: 'outline',
                  size: 'lg',
                  className: 'border-[#161616] text-[#161616] hover:bg-[#f2f2f2] font-semibold px-5 text-base',
                })}
              >
                Tìm hiểu công nghệ AI
              </Link>
            </div>

            {/* Quick Keyword Jumps */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Chủ đề tiêu biểu:</span>
              <a href="#recent" className="hover:text-[#313131] hover:underline transition-colors">Next.js App Router</a>
              <span>•</span>
              <a href="#recent" className="hover:text-[#313131] hover:underline transition-colors">Gemini AI Pipeline</a>
              <span>•</span>
              <a href="#recent" className="hover:text-[#313131] hover:underline transition-colors">Design System</a>
              <span>•</span>
              <a href="#recent" className="hover:text-[#313131] hover:underline transition-colors">NestJS Clean Code</a>
            </div>
          </div>

          {/* Right Column: "One Live Thing" - Interactive Player & AI Mindmap Sandbox */}
          <div className="lg:col-span-6">
            <div data-ui="player" className="rounded-xl border border-border bg-card overflow-hidden">
              
              {/* Player Top Bar */}
              <div className="flex items-center justify-between border-b border-border bg-[#161616] px-4 py-2.5 text-xs text-white">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#027D88]" />
                  <span className="font-semibold text-white truncate max-w-[220px] sm:max-w-xs">
                    {LIVE_PREVIEW_MOCK_DATA.lessonTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                  <Icon icon="lucide:sparkles" className="size-3.5 text-[#ffd100]" />
                  <span>Trải nghiệm tương tác mẫu</span>
                </div>
              </div>

              {/* Video Player & Interactive Overlay */}
              <div className="relative aspect-video w-full bg-[#161616] text-white flex flex-col justify-between p-4 sm:p-5 select-none overflow-hidden">
                {/* Real Video Footage Loop for dynamic live motion */}
                <video
                  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1280&q=80"
                  className="absolute inset-0 h-full w-full object-cover opacity-30 pointer-events-none"
                />

                {/* Top Badge: Current Timestamp & Chapter */}
                <div className="relative z-10 flex items-center justify-between text-xs">
                  <div className="inline-flex items-center gap-2 rounded bg-[#161616]/80 px-2.5 py-1 font-medium tabular-nums text-white/90">
                    <Icon icon="lucide:clock" className="size-3.5 text-[#ffd100]" />
                    <span>{activeBreakpoint.timestamp} / {LIVE_PREVIEW_MOCK_DATA.durationText}</span>
                  </div>
                  <div className="rounded bg-[#161616]/80 px-2.5 py-1 text-xs font-medium text-white/90">
                    {activeBreakpoint.label}
                  </div>
                </div>

                {/* Center Content: In-video Quiz Modal if active */}
                <div className="relative z-10 my-auto">
                  {activeBreakpoint.quiz ? (
                    <div data-ui="quiz-modal" className="rounded-lg border border-white/20 bg-[#161616]/95 p-3.5 sm:p-4 text-white max-w-lg mx-auto">
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#ffd100]">
                        <Icon icon="lucide:help-circle" className="size-4 text-[#F02D01]" />
                        <span>Mốc dừng In-video Quiz tự động (AssemblyAI + Gemini)</span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium mb-3 leading-snug">
                        {activeBreakpoint.quiz.question}
                      </p>

                      <div className="space-y-1.5 mb-3">
                        {activeBreakpoint.quiz.options.map((opt, idx) => {
                          const isSelected = selectedQuizOption === idx;
                          const isCorrect = idx === activeBreakpoint.quiz?.correctIndex;
                          let btnStyle = 'border-white/20 bg-white/5 text-white/90 hover:bg-white/10';

                          if (quizSubmitted) {
                            if (isCorrect) {
                              btnStyle = 'border-[#027D88] bg-[#027D88]/40 text-emerald-200 font-semibold';
                            } else if (isSelected && !isCorrect) {
                              btnStyle = 'border-[#dc2626] bg-[#dc2626]/40 text-rose-200';
                            }
                          } else if (isSelected) {
                            btnStyle = 'border-[#F02D01] bg-[#F02D01]/30 text-white font-semibold';
                          }

                          return (
                            <button
                              key={`quiz-opt-${idx}`}
                              type="button"
                              onClick={() => handleOptionClick(idx)}
                              className={`w-full text-left px-3 py-1.5 rounded border text-xs transition-colors flex items-start gap-2 ${btnStyle}`}
                            >
                              <span className="font-semibold shrink-0">{String.fromCharCode(65 + idx)}.</span>
                              <span className="leading-tight">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="p-2 rounded bg-[#027D88]/30 border border-[#027D88]/60 text-xs text-emerald-200 mb-2 leading-relaxed">
                          {activeBreakpoint.quiz.explanation}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-white/70">
                          {quizSubmitted
                            ? 'Video sẽ tự động tiếp tục khi học viên hoàn thành'
                            : 'Chọn đáp án để kiểm tra'}
                        </span>
                        {!quizSubmitted ? (
                          <Button
                            size="sm"
                            onClick={handleCheckAnswer}
                            disabled={selectedQuizOption === null}
                            className="h-7 text-xs bg-[#313131] hover:bg-[#202020] text-white font-bold"
                          >
                            Kiểm tra kết quả
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleResetQuiz}
                            className="h-7 text-xs border-white/30 text-white hover:bg-white/10"
                          >
                            Thử lại
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="inline-flex size-12 items-center justify-center rounded-full bg-white/10 mb-2">
                        <Icon icon="lucide:sparkles" className="size-6 text-[#ffd100]" />
                      </div>
                      <p className="text-sm font-semibold">{activeBreakpoint.mindmapActiveNode}</p>
                      <p className="text-xs text-white/80 mt-1 max-w-sm mx-auto">
                        Video đang phát tại mốc {activeBreakpoint.timestamp}. Nhánh sơ đồ tư duy song hành đang tự động mở rộng theo nội dung giảng viên.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Timeline Controls with Clickable Breakpoints */}
                <div className="relative z-10 pt-2">
                  <div className="relative w-full h-1.5 rounded-full bg-white/20 mb-2">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-[#027D88] transition-colors"
                      style={{
                        width: `${(activeBreakpoint.seconds / 255) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Breakpoint Selector Buttons */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/70">Bấm thử mốc AI:</span>
                      {LIVE_PREVIEW_MOCK_DATA.breakpoints.map((bp, idx) => {
                        const isActive = idx === activeBreakpointIndex;
                        return (
                          <button
                            key={bp.timestamp}
                            type="button"
                            onClick={() => handleSelectBreakpoint(idx)}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-[#313131] text-white font-bold border border-white/20'
                                : 'bg-white/10 text-white/80 hover:bg-white/20'
                            }`}
                          >
                            {bp.timestamp} {bp.quiz ? '(Quiz)' : ''}
                          </button>
                        );
                      })}
                    </div>
                    <span className="hidden sm:inline text-white/70">Trình phát tương tác 16:9</span>
                  </div>
                </div>
              </div>

              {/* Active Mindmap Synchronization Bar */}
              <div className="border-t border-[#e5e7eb] bg-[#f3fcfc] p-3 sm:p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-6 items-center justify-center rounded bg-[#027D88] text-white shrink-0">
                    <Icon icon="lucide:git-fork" className="size-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="text-[#454545] mr-1">Cây Mindmap tự động:</span>
                    <span className="font-semibold text-[#027D88]">
                      {activeBreakpoint.mindmapBranch.join(' › ')}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#027D88] shrink-0 pl-2 font-medium">
                  <Icon icon="lucide:check-circle-2" className="size-3.5" />
                  <span>Đồng bộ tức thì</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
