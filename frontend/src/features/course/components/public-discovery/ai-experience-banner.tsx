'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { buttonVariants } from '@/components/ui/button';

export function AiExperienceBanner(): React.JSX.Element {
  return (
    <section id="ai-experience" className="w-full bg-[#f8f9fa] py-16">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        
        {/* Asymmetrical Editorial Narrative Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Narrative & Process Steps */}
          <div className="lg:col-span-5 flex flex-col space-y-6 taste-enter">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#161616] leading-[1.2]">
              Tự động hóa học tập với công nghệ video đa tương tác
            </h2>

            <p className="text-base text-[#161616] leading-relaxed">
              Độc quyền trên Mindly: giải quyết triệt để sự thụ động khi học video truyền thống bằng đường ống trí tuệ nhân tạo ba giai đoạn, biến từng phút xem bài giảng thành phiên tiếp thu chủ động.
            </p>

            {/* 3 Sequential Process Steps without decorative 01/02/03 labels */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-[#DE2900] mt-2 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-[#161616]">
                    Bóc tách âm thanh có mốc thời gian (AssemblyAI)
                  </h4>
                  <p className="text-base text-[#262626] mt-0.5 leading-relaxed">
                    Tự động nhận diện giọng nói tiếng Việt, tạo phụ đề đồng bộ và gắn kèm timestamp chi tiết đến từng câu giảng viên.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-[#027D88] mt-2 shrink-0" />
                <div>
                  <h4 className="text-base font-bold text-[#161616]">
                    Tổng hợp cây sơ đồ tư duy Mindmap (Google Gemini)
                  </h4>
                  <p className="text-base text-[#262626] mt-0.5 leading-relaxed">
                    AI phân tích toàn bộ ngữ cảnh bài giảng để kiến tạo cây tri thức phân cấp, tự động mở rộng nhánh tương ứng với tiến trình video.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-[#ffd100] mt-2 shrink-0 border border-[#161616]/30" />
                <div>
                  <h4 className="text-base font-bold text-[#161616]">
                    Kiểm tra kiến thức chủ động tại điểm dừng In-video Quiz
                  </h4>
                  <p className="text-base text-[#262626] mt-0.5 leading-relaxed">
                    Hệ thống tự động kích hoạt câu hỏi trắc nghiệm khi chạm đến mốc kiến thức trọng tâm, giúp người học ghi nhớ sâu hơn 80%.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Interactive Pipeline Showcase Box */}
          <div className="lg:col-span-7 taste-enter taste-enter-delay-2">
            <div data-ui="pipeline-preview" className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
              
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-[#282828] bg-[#161616] px-4 py-3 text-xs text-white">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#DE2900]" />
                    <span className="size-2.5 rounded-full bg-[#ffd100]" />
                    <span className="size-2.5 rounded-full bg-[#027D88]" />
                  </div>
                  <span className="font-semibold text-neutral-200 ml-2">
                    Mindly AI Engine Pipeline (Realtime Synchronizer)
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-300">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span>RabbitMQ Connected</span>
                </div>
              </div>

              {/* Window Body: 2 Split Sub-panels */}
              <div className="p-5 sm:p-6 space-y-5">
                
                {/* Upper: Transcript Stream with Timestamps */}
                <div className="rounded-lg border border-[#e5e7eb] bg-[#f8f9fa] p-4">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[#161616]">
                    <div className="flex items-center gap-1.5 text-[#161616]">
                      <Icon icon="lucide:mic" className="size-4 text-[#DE2900]" />
                      <span>Luồng phụ đề thời gian thực (AssemblyAI STT)</span>
                    </div>
                    <span className="rounded bg-white px-2 py-0.5 text-xs text-[#027D88] font-bold border border-[#e5e7eb]">
                      Độ trễ &lt; 200ms
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2.5 p-2 rounded bg-white border border-[#e5e7eb]">
                      <span className="rounded bg-[#161616] text-white px-2 py-0.5 text-xs shrink-0 font-bold tabular-nums">
                        00:45
                      </span>
                      <p className="text-[#161616] leading-relaxed">
                        Server Components trong Next.js App Router xử lý trực tiếp trên máy chủ, trả về HTML tĩnh mà không làm tăng dung lượng bundle client.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2 rounded bg-[#f3fcfc] border border-[#027D88]/30">
                      <span className="rounded bg-[#DE2900] text-white px-2 py-0.5 text-xs shrink-0 font-bold tabular-nums">
                        01:30
                      </span>
                      <p className="text-[#161616] leading-relaxed font-semibold">
                        Điểm mấu chốt là chỉ thị &quot;use client&quot; cần được đặt tại các component tương tác như form, modal để giữ kiến trúc tối ưu.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lower Split: Mindmap Tree & In-video Quiz Checkpoint */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Mindmap Node Tree */}
                  <div className="rounded-lg border border-[#e5e7eb] bg-[#f3fcfc] p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#027D88] mb-3">
                        <Icon icon="lucide:git-fork" className="size-4" />
                        <span>Sơ đồ tư duy Gemini Markmap</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#161616]">
                        <div className="flex items-center gap-1.5 font-bold text-[#027D88]">
                          <span className="size-2 rounded-full bg-[#027D88]" />
                          <span>Next.js Architecture</span>
                        </div>
                        <div className="ml-3 pl-2.5 border-l-2 border-[#027D88]/40 space-y-1 text-xs">
                          <div className="text-[#161616] font-semibold">├─ RSC Server Execution</div>
                          <div className="text-[#027D88] font-bold bg-white px-1.5 py-0.5 rounded border border-[#027D88]/20">
                            ├─ Client Boundary [Đang phát]
                          </div>
                          <div className="text-[#262626]">└─ Server Mutations</div>
                        </div>
                      </div>
                    </div>

                    <div data-ui="card-footer" className="mt-4 pt-2 border-t border-[#027D88]/20 flex items-center justify-between text-xs text-[#027D88] font-medium">
                      <span>Phân cấp 3 cấp độ</span>
                      <span>Markdown chuẩn</span>
                    </div>
                  </div>

                  {/* In-video Quiz Checkpoint */}
                  <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#DE2900] mb-2">
                        <Icon icon="lucide:check-circle-2" className="size-4 text-[#DE2900]" />
                        <span>Mốc In-video Quiz (01:30)</span>
                      </div>

                      <p className="text-xs text-[#161616] font-semibold leading-snug mb-2.5">
                        Khi nào bắt buộc phải khai báo chỉ thị &quot;use client&quot;?
                      </p>

                      <div className="rounded bg-[#f3fcfc] border border-[#027D88]/40 p-2 text-xs text-[#027D88] font-medium flex items-start gap-1.5">
                        <Icon icon="lucide:check" className="size-3.5 text-[#027D88] shrink-0 mt-0.5" />
                        <span>Khi dùng useState, useEffect hoặc xử lý sự kiện client.</span>
                      </div>
                    </div>

                    <div data-ui="card-footer" className="mt-3 pt-2 border-t border-[#e5e7eb] flex items-center justify-between text-xs text-[#161616]">
                      <span>Đạt chuẩn 100%</span>
                      <span className="font-semibold text-[#027D88]">Tự động tiếp tục phát</span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Bottom CTA Row: Domestika dark banner with Red CTA button */}
        <div data-ui="cta-banner" className="mt-14 rounded-xl bg-[#161616] text-white p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Bắt đầu hành trình nâng cao kỹ năng hôm nay
            </h3>
            <p className="text-base text-neutral-300">
              Đăng ký tài khoản miễn phí để trải nghiệm toàn bộ tính năng bài giảng video và sơ đồ AI.
            </p>
          </div>
          <Link
            href="/register"
            className={buttonVariants({
              size: 'lg',
              className: 'bg-[#DE2900] text-white hover:bg-[#c42400] font-bold px-6 shrink-0 shadow-none text-base',
            })}
          >
            Tạo tài khoản học viên miễn phí
          </Link>
        </div>

      </div>
    </section>
  );
}
