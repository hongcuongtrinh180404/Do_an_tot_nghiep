'use client';

import React from 'react';
import Link from 'next/link';
import { MindlyLogo } from '@/components/brand';

export function PublicFooter(): React.JSX.Element {
  return (
    <footer data-ui="footer" className="w-full border-t border-[#282828] bg-[#161616] text-white pt-16 pb-12">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#282828]">
          
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-90"
              aria-label="Mindly - Map Your Mind - Trang chủ"
            >
              <MindlyLogo
                variant="dark-header"
                className="h-11 w-auto"
                showSlogan={true}
              />
            </Link>

            <p className="text-sm text-neutral-300 leading-relaxed max-w-sm">
              Nền tảng học trực tuyến video đa tương tác hàng đầu, tiên phong ứng dụng công nghệ trí tuệ nhân tạo tạo Sơ đồ tư duy và Bài tập In-video Quiz từ nội dung bài giảng.
            </p>

            <div className="text-xs text-neutral-300">
              Đề tài Đồ án tốt nghiệp Đại học: Monorepo Architecture NestJS & Next.js App Router.
            </div>
          </div>

          {/* Quick Links Cols */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">
                Khám phá
              </h4>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li>
                  <Link href="#featured" className="hover:text-white transition-colors">
                    Khóa học nổi bật
                  </Link>
                </li>
                <li>
                  <Link href="#categories" className="hover:text-white transition-colors">
                    Lĩnh vực đào tạo
                  </Link>
                </li>
                <li>
                  <Link href="#recent" className="hover:text-white transition-colors">
                    Khóa học mới nhất
                  </Link>
                </li>
                <li>
                  <Link href="#ai-experience" className="hover:text-white transition-colors">
                    Trải nghiệm AI
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">
                Giảng viên & Học viên
              </h4>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Đăng nhập cổng học viên
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white transition-colors">
                    Đăng ký tài khoản mới
                  </Link>
                </li>
                <li>
                  <Link href="/instructor/courses" className="hover:text-white transition-colors">
                    Dành cho Giảng viên
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-white transition-colors">
                    Hồ sơ cá nhân
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">
                Công nghệ
              </h4>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li><span>AssemblyAI Transcription</span></li>
                <li><span>Google Gemini Flash</span></li>
                <li><span>Markmap Interactive</span></li>
                <li><span>RabbitMQ Async Broker</span></li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Image Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-300 gap-3">
          <p>© 2026 Mindly E-Learning Platform. Bảo lưu mọi quyền.</p>
          <p className="text-xs text-neutral-300">
            Hình ảnh tư liệu bài giảng được chọn lọc từ Unsplash License.
          </p>
        </div>

      </div>
    </footer>
  );
}
