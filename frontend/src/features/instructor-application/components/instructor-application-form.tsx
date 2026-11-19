'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { usePublicCategoriesQuery } from '@/features/course/api/course-category.api';
import {
  useApplyInstructorMutation,
  useInstructorApplicationTermsQuery,
} from '../api/instructor-application.api';
import {
  INSTRUCTOR_EXPERTISE_OPTIONS,
  INSTRUCTOR_TERMS_MOCK,
  type InstructorApplication,
} from '../instructor-application';
import { CvFileUpload } from './cv-file-upload';
import styles from './become-instructor.module.css';

interface UserInfo {
  id?: string;
  fullName?: string;
  email?: string;
}

interface InstructorApplicationFormProps {
  user: UserInfo | null | undefined;
  isGuest: boolean;
  loginHref: string;
  onSubmitSuccess: (data: NonNullable<InstructorApplication['applicantData']>) => void;
  onCancel?: () => void;
  initialData?: InstructorApplication['applicantData'];
}

export function InstructorApplicationForm({
  user,
  isGuest,
  loginHref,
  onSubmitSuccess,
  onCancel,
  initialData,
}: InstructorApplicationFormProps): React.JSX.Element {
  const [fullName, setFullName] = useState(initialData?.fullName || user?.fullName || '');
  const [email] = useState(initialData?.email || user?.email || (isGuest ? 'hocvien@mindly.edu.vn' : ''));
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [selectedExpertises, setSelectedExpertises] = useState<string[]>(
    initialData?.expertises || [],
  );
  const [customExpertiseInput, setCustomExpertiseInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [bio, setBio] = useState(initialData?.bio || '');
  const [experience, setExperience] = useState(initialData?.experience || '');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyMutation = useApplyInstructorMutation();
  const { data: termsData } = useInstructorApplicationTermsQuery();
  const isPendingSubmission = isSubmitting || applyMutation.isPending;

  const { data: publicCategories } = usePublicCategoriesQuery();

  const availableExpertises = useMemo<string[]>(() => {
    if (publicCategories && publicCategories.length > 0) {
      return publicCategories
        .filter((cat) => cat.isActive !== false)
        .map((cat) => cat.name);
    }
    return [...INSTRUCTOR_EXPERTISE_OPTIONS];
  }, [publicCategories]);

  function toggleExpertise(item: string): void {
    setSelectedExpertises((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
    if (errors.expertises) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.expertises;
        return next;
      });
    }
  }

  function handleAddCustomExpertise(): void {
    const trimmed = customExpertiseInput.trim();
    if (trimmed && !selectedExpertises.includes(trimmed)) {
      setSelectedExpertises((prev) => [...prev, trimmed]);
      setCustomExpertiseInput('');
      setIsAddingCustom(false);
      if (errors.expertises) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.expertises;
          return next;
        });
      }
    }
  }

  function validateForm(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Vui lòng nhập họ và tên của bạn.';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Vui lòng cung cấp số điện thoại để liên hệ.';
    } else {
      // Clean phone string
      const cleanPhone = phone.replace(/[\s.-]/g, '');
      const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
      if (!phoneRegex.test(cleanPhone) && cleanPhone.length < 9) {
        nextErrors.phone = 'Số điện thoại không đúng định dạng (Ví dụ: 0912 345 678).';
      }
    }

    if (selectedExpertises.length === 0) {
      nextErrors.expertises = 'Vui lòng chọn ít nhất một lĩnh vực bạn muốn giảng dạy.';
    }

    if (!bio.trim()) {
      nextErrors.bio = 'Vui lòng viết mô tả ngắn giới thiệu bản thân.';
    } else if (bio.trim().length < 20) {
      nextErrors.bio = 'Giới thiệu bản thân nên có ít nhất 20 ký tự.';
    }

    if (!experience.trim()) {
      nextErrors.experience = 'Vui lòng nêu rõ kinh nghiệm làm việc hoặc giảng dạy.';
    } else if (experience.trim().length < 20) {
      nextErrors.experience = 'Kinh nghiệm chuyên môn nên có ít nhất 20 ký tự.';
    }

    if (!cvFile && !initialData?.cvFileName) {
      nextErrors.cv = 'Vui lòng tải lên tài liệu CV (PDF hoặc Word).';
    }

    if (!agreedTerms) {
      nextErrors.terms = 'Bạn cần đồng ý với các điều khoản dành cho giảng viên để gửi đăng ký.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();

    if (isGuest) {
      toast.info('Vui lòng đăng nhập bằng tài khoản học viên để hoàn tất gửi đơn đăng ký.');
      return;
    }

    if (!validateForm()) {
      toast.error('Vui lòng hoàn thiện các trường thông tin bắt buộc còn thiếu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        expertises: selectedExpertises,
        bio: bio.trim(),
        experience: experience.trim(),
        cvFileName: cvFile?.name || initialData?.cvFileName || 'Ho-so-giang-vien.pdf',
      };

      if (!isGuest) {
        await applyMutation.mutateAsync({
          phone: payload.phone,
          expertises: payload.expertises,
          bio: payload.bio,
          experience: payload.experience,
          cvFileName: payload.cvFileName,
        });
      } else {
        toast.success('Gửi yêu cầu đăng ký giảng viên thành công! Admin sẽ xem xét hồ sơ của bạn.');
      }

      onSubmitSuccess(payload);
    } catch {
      // Error is handled inside mutation
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.instructorForm} onSubmit={handleSubmit} noValidate>
      {isGuest && (
        <div className={styles.guestAlertBanner} role="note">
          <Icon icon="lucide:info" className={styles.guestAlertIcon} />
          <div className={styles.guestAlertContent}>
            <strong>Bạn đang xem trước biểu mẫu với tư cách Khách</strong>
            <p>
              Hãy đăng nhập bằng tài khoản học viên Mindly của bạn để hệ thống tự động điền thông tin và
              lưu hồ sơ đăng ký chính thức.
            </p>
            <Link href={loginHref} className={styles.loginLinkButton}>
              Đăng nhập ngay <Icon icon="lucide:arrow-right" />
            </Link>
          </div>
        </div>
      )}

      {/* PHẦN 1: THÔNG TIN CÁ NHÂN */}
      <section className={styles.formSection} aria-labelledby="sec-personal-info">
        <header className={styles.sectionHeader}>
          <span className={styles.sectionStepNumber}>Phần 1</span>
          <h3 id="sec-personal-info">Thông tin cá nhân</h3>
        </header>

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="instructor-fullname" className={styles.fieldLabel}>
              Họ và tên <span className={styles.requiredAsterisk}>*</span>
            </label>
            <input
              id="instructor-fullname"
              type="text"
              className={`${styles.textInput} ${errors.fullName ? styles.inputError : ''}`}
              placeholder="Ví dụ: Nguyễn Văn Minh"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.fullName;
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullname-error' : undefined}
            />
            {errors.fullName ? (
              <span id="fullname-error" className={styles.fieldError}>
                <Icon icon="lucide:alert-circle" /> {errors.fullName}
              </span>
            ) : (
              <span className={styles.helperText}>Tự động đồng bộ từ tài khoản Mindly</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="instructor-email" className={styles.fieldLabel}>
              Email liên hệ <span className={styles.requiredAsterisk}>*</span>
            </label>
            <div className={styles.readonlyInputWrapper}>
              <input
                id="instructor-email"
                type="email"
                className={`${styles.textInput} ${styles.readonlyInput}`}
                value={email}
                readOnly
                disabled
                aria-readonly="true"
                aria-describedby="email-locked-note"
              />
              <span className={styles.lockedBadge} id="email-locked-note">
                <Icon icon="lucide:lock" /> Cố định
              </span>
            </div>
            <span className={styles.helperText}>
              Email lấy trực tiếp từ tài khoản và không thể sửa tại biểu mẫu này.
            </span>
          </div>
        </div>

        <div className={styles.formRowSingle}>
          <div className={styles.fieldGroup}>
            <label htmlFor="instructor-phone" className={styles.fieldLabel}>
              Số điện thoại liên hệ <span className={styles.requiredAsterisk}>*</span>
            </label>
            <input
              id="instructor-phone"
              type="tel"
              className={`${styles.textInput} ${errors.phone ? styles.inputError : ''}`}
              placeholder="Ví dụ: 0912 345 678"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.phone;
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'phone-error' : 'phone-desc'}
            />
            {errors.phone ? (
              <span id="phone-error" className={styles.fieldError}>
                <Icon icon="lucide:alert-circle" /> {errors.phone}
              </span>
            ) : (
              <span id="phone-desc" className={styles.helperText}>
                Số điện thoại để Admin Mindly liên hệ phỏng vấn hoặc hỗ trợ khi cần.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* PHẦN 2: THÔNG TIN CHUYÊN MÔN */}
      <section className={styles.formSection} aria-labelledby="sec-expertise-info">
        <header className={styles.sectionHeader}>
          <span className={styles.sectionStepNumber}>Phần 2</span>
          <h3 id="sec-expertise-info">Thông tin chuyên môn</h3>
        </header>

        {/* Lĩnh vực chuyên môn dạng multi-select tag chips */}
        <div className={styles.fieldGroup}>
          <div className={styles.labelWithHint}>
            <span id="expertise-chips-label" className={styles.fieldLabel}>
              Lĩnh vực chuyên môn muốn giảng dạy <span className={styles.requiredAsterisk}>*</span>
            </span>
            <span className={styles.secondaryLabelNote}>(Có thể chọn nhiều lĩnh vực)</span>
          </div>

          <div
            className={styles.chipsGroup}
            role="group"
            aria-labelledby="expertise-chips-label"
          >
            {availableExpertises.map((item) => {
              const isSelected = selectedExpertises.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  className={`${styles.chipButton} ${isSelected ? styles.chipButtonActive : ''}`}
                  onClick={() => toggleExpertise(item)}
                  disabled={isSubmitting}
                  aria-pressed={isSelected}
                >
                  <Icon
                    icon={isSelected ? 'lucide:check' : 'lucide:plus'}
                    className={styles.chipIcon}
                  />
                  <span>{item}</span>
                </button>
              );
            })}

            {/* Any custom selected expertises that aren't in predefined list */}
            {selectedExpertises
              .filter((item) => !availableExpertises.includes(item))
              .map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`${styles.chipButton} ${styles.chipButtonActive}`}
                  onClick={() => toggleExpertise(item)}
                  disabled={isSubmitting}
                  aria-pressed="true"
                >
                  <Icon icon="lucide:check" className={styles.chipIcon} />
                  <span>{item}</span>
                  <Icon icon="lucide:x" className={styles.chipRemoveIcon} />
                </button>
              ))}

            {isAddingCustom ? (
              <div className={styles.customChipInputRow}>
                <input
                  type="text"
                  placeholder="Nhập tên lĩnh vực..."
                  className={styles.customChipInput}
                  value={customExpertiseInput}
                  onChange={(e) => setCustomExpertiseInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomExpertise();
                    } else if (e.key === 'Escape') {
                      setIsAddingCustom(false);
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.addCustomBtn}
                  onClick={handleAddCustomExpertise}
                >
                  Thêm
                </button>
                <button
                  type="button"
                  className={styles.cancelCustomBtn}
                  onClick={() => setIsAddingCustom(false)}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.addMoreChipBtn}
                onClick={() => setIsAddingCustom(true)}
                disabled={isSubmitting}
              >
                <Icon icon="lucide:edit-3" />
                <span>+ Lĩnh vực khác</span>
              </button>
            )}
          </div>

          {errors.expertises ? (
            <span className={styles.fieldError}>
              <Icon icon="lucide:alert-circle" /> {errors.expertises}
            </span>
          ) : (
            <span className={styles.helperText}>
              Đã chọn: <strong>{selectedExpertises.length}</strong> lĩnh vực
            </span>
          )}
        </div>

        {/* Giới thiệu bản thân */}
        <div className={styles.fieldGroup}>
          <div className={styles.labelWithCounter}>
            <label htmlFor="instructor-bio" className={styles.fieldLabel}>
              Giới thiệu bản thân <span className={styles.requiredAsterisk}>*</span>
            </label>
            <span className={styles.characterCounter}>{bio.length} ký tự</span>
          </div>
          <textarea
            id="instructor-bio"
            rows={3}
            className={`${styles.textAreaInput} ${errors.bio ? styles.inputError : ''}`}
            placeholder="Mô tả ngắn gọn về bản thân, phong cách giảng dạy và lý do bạn muốn chia sẻ kiến thức trên Mindly..."
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              if (errors.bio) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.bio;
                  return next;
                });
              }
            }}
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
          />
          {errors.bio && (
            <span id="bio-error" className={styles.fieldError}>
              <Icon icon="lucide:alert-circle" /> {errors.bio}
            </span>
          )}
        </div>

        {/* Kinh nghiệm chuyên môn */}
        <div className={styles.fieldGroup}>
          <div className={styles.labelWithCounter}>
            <label htmlFor="instructor-experience" className={styles.fieldLabel}>
              Kinh nghiệm chuyên môn <span className={styles.requiredAsterisk}>*</span>
            </label>
            <span className={styles.characterCounter}>{experience.length} ký tự</span>
          </div>
          <textarea
            id="instructor-experience"
            rows={4}
            className={`${styles.textAreaInput} ${errors.experience ? styles.inputError : ''}`}
            placeholder="Chia sẻ chi tiết các năm kinh nghiệm làm việc thực tế, dự án tiêu biểu, các đơn vị từng công tác hoặc kinh nghiệm đào tạo, giảng dạy trước đây..."
            value={experience}
            onChange={(e) => {
              setExperience(e.target.value);
              if (errors.experience) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.experience;
                  return next;
                });
              }
            }}
            disabled={isSubmitting}
            aria-required="true"
            aria-invalid={Boolean(errors.experience)}
            aria-describedby={errors.experience ? 'exp-error' : undefined}
          />
          {errors.experience && (
            <span id="exp-error" className={styles.fieldError}>
              <Icon icon="lucide:alert-circle" /> {errors.experience}
            </span>
          )}
        </div>
      </section>

      {/* PHẦN 3: HỒ SƠ NĂNG LỰC (UPLOAD CV) */}
      <section className={styles.formSection} aria-labelledby="sec-cv-info">
        <header className={styles.sectionHeader}>
          <span className={styles.sectionStepNumber}>Phần 3</span>
          <h3 id="sec-cv-info">Hồ sơ năng lực (CV)</h3>
        </header>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Tài liệu CV / Sơ yếu lý lịch <span className={styles.requiredAsterisk}>*</span>
          </label>
          <CvFileUpload
            file={cvFile}
            onFileSelect={(file) => {
              setCvFile(file);
              if (errors.cv) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.cv;
                  return next;
                });
              }
            }}
            error={errors.cv}
            disabled={isSubmitting}
          />
        </div>
      </section>

      {/* PHẦN 4: ĐIỀU KHOẢN GIẢNG VIÊN */}
      <section className={styles.formSection} aria-labelledby="sec-terms-info">
        <header className={styles.sectionHeader}>
          <span className={styles.sectionStepNumber}>Phần 4</span>
          <h3 id="sec-terms-info">Điều khoản dành cho giảng viên</h3>
        </header>

        <div className={styles.termsBox}>
          <div className={styles.termsHeader}>
            <Icon icon="lucide:shield-check" className={styles.termsIcon} />
            <strong>Quy định và quyền lợi đối tác Mindly</strong>
          </div>
          <ol className={styles.termsList}>
            {termsData && termsData.length > 0
              ? termsData.map((term, idx) => (
                <li key={term.id || idx} className={styles.termItem}>
                  <strong>{term.title}: </strong>
                  <span>{term.content}</span>
                </li>
              ))
              : INSTRUCTOR_TERMS_MOCK.map((term, idx) => (
                <li key={idx} className={styles.termItem}>
                  <span>{term}</span>
                </li>
              ))}
          </ol>
          <p className={styles.termsNote}>
            * Nội dung điều khoản có thể được cập nhật theo từng giai đoạn và hiển thị trong hợp đồng
            chính thức.
          </p>
        </div>
      </section>

      {/* PHẦN 5: XÁC NHẬN VÀ GỬI ĐĂNG KÝ */}
      <section className={styles.formSectionConfirm} aria-label="Xác nhận và gửi đăng ký">
        <div className={styles.commitmentRow}>
          <label className={styles.checkboxWrapper}>
            <input
              type="checkbox"
              id="instructor-commitment"
              className={styles.customCheckbox}
              checked={agreedTerms}
              onChange={(e) => {
                setAgreedTerms(e.target.checked);
                if (errors.terms) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.terms;
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
              aria-required="true"
            />
            <span className={styles.checkboxLabelText}>
              Tôi cam kết các thông tin cung cấp là chính xác và đồng ý với điều khoản dành cho giảng
              viên của Mindly, bao gồm việc sử dụng hồ sơ đăng ký để xét duyệt.
            </span>
          </label>
        </div>

        {errors.terms && (
          <span className={styles.fieldError}>
            <Icon icon="lucide:alert-circle" /> {errors.terms}
          </span>
        )}

        <div className={styles.submitActionsRow}>
          {isGuest ? (
            <Link href={loginHref} className={styles.submitButton}>
              <span>Đăng nhập để gửi yêu cầu</span>
              <Icon icon="lucide:arrow-right" />
            </Link>
          ) : (
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isPendingSubmission}
              aria-busy={isPendingSubmission}
            >
              {isPendingSubmission ? (
                <>
                  <Icon icon="lucide:loader-2" className={styles.spinnerIcon} />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <span>Gửi yêu cầu đăng ký</span>
                  <Icon icon="lucide:arrow-up-right" />
                </>
              )}
            </button>
          )}

          {onCancel && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              disabled={isPendingSubmission}
            >
              Hủy bỏ
            </button>
          )}
        </div>
      </section>
    </form>
  );
}
