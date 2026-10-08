# React Hook Form + Zod + Server Actions 가이드

이 문서는 **Next.js 16 + React 19.2** 환경에서 React Hook Form(RHF) + Zod 4 + Server Actions를 활용한 폼 처리 패턴을 제공합니다.

> 기준: React Hook Form v7, `@hookform/resolvers` v5, Zod v4, shadcn/ui `Field` 컴포넌트 (context7 문서 확인).
> 관련 가이드: [component-patterns.md](./component-patterns.md), [nextjs-16.md](./nextjs-16.md), [styling-guide.md](./styling-guide.md)

## 📌 먼저 읽기: 언제 무엇을 쓰나

| 상황                                                               | 권장 방식                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 필드가 적고 서버 검증만으로 충분 (검색, 간단한 설정)               | **`<form action>` + `useActionState`** (RHF 불필요)                                   |
| 실시간 검증, 복잡한 필드 상호작용, 다단계/동적 필드, 파일 미리보기 | **RHF + Zod + Server Action**                                                         |
| Supabase Auth 로그인/가입                                          | 클라이언트에서 `supabase.auth.*` 직접 호출 (현재 `login-form.tsx`) 또는 Server Action |

> 이 프로젝트의 기존 폼(`components/login-form.tsx` 등)은 `useState` + Supabase 클라이언트 방식입니다. 새 폼부터 이 문서의 패턴을 적용하세요.

## 🚀 기본 설정 및 셋업

### 패키지 설치

⚠️ `react-hook-form`, `zod`, `@hookform/resolvers`는 **현재 이 프로젝트에 설치되어 있지 않습니다.** 폼 작업 전에 설치하세요.

```bash
npm install react-hook-form @hookform/resolvers zod

# shadcn 폼 UI (Field 기반) + 토스트(sonner)
npx shadcn@latest add field select textarea sonner

# 선택: 디바운스가 필요한 경우
npm install use-debounce
```

- `@hookform/resolvers` v5의 `zodResolver`는 **Zod v3과 v4를 모두 자동 감지**합니다.
- `import { z } from "zod"`로 가져옵니다 (v4가 기본 export).
- shadcn의 기존 `Form`/`FormField` 래퍼 대신 **`Controller` + `Field`** 조합이 현재 공식 가이드입니다.

### 공통 타입

```typescript
// lib/types/forms.ts

// Server Action 반환 타입 (useActionState의 상태)
export type ActionResult<T = unknown> =
  | { success: true; message: string; data?: T }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export const initialActionResult: ActionResult = {
  success: false,
  message: "",
};
```

## 🚀 필수 패턴: 기본 폼 아키텍처

### 1. 스키마 정의 (클라이언트/서버 공유)

스키마 파일에는 `"use client"`/`"use server"`를 쓰지 않습니다. 양쪽에서 같은 스키마를 import해야 합니다.

```typescript
// lib/schemas/auth.ts
import { z } from "zod";

// 🚀 재사용 가능한 기본 스키마
// Zod 4: z.string().email() → z.email(), 메시지는 { error } 또는 문자열
export const emailSchema = z.email("올바른 이메일 형식이 아닙니다");

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
  .regex(/[a-z]/, "소문자를 포함해야 합니다")
  .regex(/[A-Z]/, "대문자를 포함해야 합니다")
  .regex(/\d/, "숫자를 포함해야 합니다");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "이름은 최소 2자 이상이어야 합니다")
      .max(50, "이름은 최대 50자까지 입력 가능합니다"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.boolean().refine((v) => v === true, {
      error: "이용약관에 동의해주세요", // Zod 4: message → error (message도 호환 지원)
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

#### Zod 4 변경 요약

| Zod 3                                             | Zod 4                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `z.string().email()` / `.url()` / `.uuid()`       | `z.email()` / `z.url()` / `z.uuid()` (최상위 함수)                           |
| `{ message: "..." }`                              | `{ error: "..." }` (`message`도 계속 동작)                                   |
| `err.flatten()` / `err.format()`                  | `z.flattenError(err)` / `z.treeifyError(err)` (인스턴스 메서드는 deprecated) |
| `a.merge(b)`                                      | `z.object({ ...a.shape, ...b.shape })` 또는 `a.extend(b.shape)`              |
| 필수 에러: `required_error`, `invalid_type_error` | `error` 함수/문자열 하나로 통합                                              |

### 2. Server Action 정의

Server Action은 **공개 HTTP 엔드포인트**입니다. 클라이언트 검증 여부와 관계없이 **항상 서버에서 스키마로 재검증하고, 인증/인가를 확인**하세요.

```typescript
// lib/actions/auth.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/schemas/auth";
import type { ActionResult } from "@/lib/types/forms";

// RHF가 검증한 "객체"를 받는 Server Action (useActionState 시그니처: (prevState, payload))
export async function loginAction(
  _prev: ActionResult,
  input: unknown, // ← 클라이언트 입력은 신뢰하지 않으므로 unknown으로 받아 재검증
): Promise<ActionResult> {
  // 🚀 필수: 서버 사이드 스키마 검증
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "입력된 정보를 확인해주세요",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      success: false,
      message: "이메일 또는 비밀번호가 올바르지 않습니다",
    };
  }

  redirect("/protected"); // 예외를 던져 종료 → try/catch 안에서 호출하지 말 것
}
```

- `redirect()`는 내부적으로 예외를 던지므로 **`try/catch` 밖**에서 호출합니다.
- 에러 메시지는 계정 존재 여부가 드러나지 않도록 일반적인 문구를 사용합니다.
- 부가 작업(로그, 분석, 이메일)은 `after()`(`next/server`)로 응답 이후에 처리할 수 있습니다.

### 3. 폼 컴포넌트: RHF + `useActionState` + `Field`

RHF 공식 문서가 권장하는 연결 방식입니다. `useActionState`가 반환하는 dispatch 함수를 `handleSubmit` 안에서 호출하면, **클라이언트 검증을 통과한 데이터만** 서버로 전송됩니다. `useEffect`로 상태를 동기화할 필요가 없습니다.

```tsx
// components/forms/login-form.tsx
"use client";

import { startTransition, useActionState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { initialActionResult } from "@/lib/types/forms";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, submitAction, isPending] = useActionState(
    loginAction,
    initialActionResult,
  );

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched", // 처음엔 blur 후 검증, 이후 변경 시마다 재검증
  });

  const onSubmit = (data: LoginInput) => {
    // useActionState의 dispatch는 transition 안에서 호출
    startTransition(() => submitAction(data));
  };

  // 서버가 돌려준 필드 에러가 있으면 표시 (클라이언트 에러가 우선)
  const serverErrors = !state.success ? state.fieldErrors : undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>이메일</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="email"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                placeholder="you@example.com"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              {!fieldState.invalid && serverErrors?.email && (
                <FieldError>{serverErrors.email[0]}</FieldError>
              )}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>비밀번호</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* 서버 메시지: 스크린리더에 알리기 위해 role="alert" */}
        {state.message && !state.success && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              로그인 중...
            </>
          ) : (
            "로그인"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
```

- `register`와 `Controller`: 네이티브 `<input>`에는 `register`가 가장 가볍고, shadcn `Select`/`Checkbox` 등 **제어 컴포넌트에는 `Controller`** 를 사용합니다.
- `<Input {...field} />`: React 19에서는 `ref`가 일반 prop이므로 `field.ref`가 그대로 전달되어 포커스 이동이 동작합니다.
- 서버 필드 에러를 폼 상태에 반영하고 싶다면 `useEffect` 대신 **action 결과를 렌더 시점에 읽어 표시**하는 방식을 우선하세요.

### 4. `<form action>` 직접 사용 (RHF 없이)

단순한 폼은 RHF 없이 Server Action + `useActionState`만으로 충분합니다. JS가 로드되기 전에도 동작하는 **점진적 향상(progressive enhancement)** 이 가능합니다.

```tsx
"use client";

import { useActionState } from "react";
import { subscribeAction } from "@/lib/actions/newsletter";
import { initialActionResult } from "@/lib/types/forms";

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState(
    subscribeAction,
    initialActionResult,
  );

  return (
    <form action={formAction}>
      <input
        name="email"
        type="email"
        required
        aria-describedby="email-error"
      />
      {!state.success && state.fieldErrors?.email && (
        <p id="email-error" role="alert">
          {state.fieldErrors.email[0]}
        </p>
      )}
      <button disabled={isPending}>구독</button>
    </form>
  );
}
```

```typescript
// lib/actions/newsletter.ts
"use server";

import { z } from "zod";
import { emailSchema } from "@/lib/schemas/auth";
import type { ActionResult } from "@/lib/types/forms";

export async function subscribeAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = z.object({ email: emailSchema }).safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "입력을 확인해주세요",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  // ... 저장 로직
  return { success: true, message: "구독되었습니다" };
}
```

> `useActionState`의 폼 액션이 실행되면 **React가 비제어 폼 필드를 자동 리셋**합니다. 에러 시에도 입력값을 유지하려면 `defaultValue`로 이전 값을 반환·복원하거나 RHF(제어 방식)를 사용하세요.

### 타입 주의: 입력 타입 ≠ 출력 타입

`z.coerce`, `transform`, `pipe`를 쓰면 스키마의 **입력(input)** 과 **출력(output)** 타입이 달라집니다. 이때는 `useForm`에 세 제네릭을 명시합니다.

```tsx
const schema = z.object({
  age: z.string().pipe(z.coerce.number().min(1)), // 입력 string → 출력 number
});

const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
  resolver: zodResolver(schema),
});
// handleSubmit 콜백은 z.output 타입({ age: number })을 받음
```

## ✅ 권장 사항: 고급 폼 패턴

### 다단계 폼 (Multi-step Form)

핵심: **단계마다 `useForm`을 하나 두고**, 상위 컴포넌트가 누적 데이터를 보관합니다. (하나의 `useForm`에서 `resolver`를 단계별로 바꾸면 상태가 꼬이기 쉽습니다.)

```tsx
// components/forms/multi-step-form.tsx
"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const step1Schema = z.object({
  firstName: z.string().min(1, "이름을 입력해주세요"),
  email: z.email("올바른 이메일을 입력해주세요"),
});
const step2Schema = z.object({
  company: z.string().min(1, "회사명을 입력해주세요"),
  experience: z.enum(["junior", "mid", "senior"]),
});

// Zod 4: merge 대신 shape 병합
const completeSchema = z.object({ ...step1Schema.shape, ...step2Schema.shape });
type CompleteData = z.infer<typeof completeSchema>;

export function MultiStepForm({
  onComplete,
}: {
  onComplete: (data: CompleteData) => void;
}) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<CompleteData>>({});

  const merge = (patch: Partial<CompleteData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  return (
    <div>
      <p aria-live="polite">단계 {step + 1} / 2</p>

      {/* key로 단계 전환 시 폼 상태를 초기화 */}
      {step === 0 && (
        <Step1
          key="step1"
          defaultValues={data}
          onNext={(v) => {
            merge(v);
            setStep(1);
          }}
        />
      )}
      {step === 1 && (
        <Step2
          key="step2"
          defaultValues={data}
          onBack={() => setStep(0)}
          onNext={(v) => {
            const all = completeSchema.parse({ ...data, ...v }); // 최종 재검증
            onComplete(all);
          }}
        />
      )}
    </div>
  );
}

function Step1({
  defaultValues,
  onNext,
}: {
  defaultValues: Partial<CompleteData>;
  onNext: (v: z.infer<typeof step1Schema>) => void;
}) {
  const form = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      firstName: defaultValues.firstName ?? "",
      email: defaultValues.email ?? "",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onNext)} noValidate>
      <FieldGroup>
        <Controller
          name="firstName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>이름</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {/* email 필드 동일 패턴 */}
        <Button type="submit">다음</Button>
      </FieldGroup>
    </form>
  );
}

// Step2도 동일 구조: useForm(step2Schema) + onBack/onNext
```

- 최종 제출 시에는 **전체 스키마로 서버에서 다시 검증**합니다 (Server Action).
- 단계 진행 상태를 URL(`?step=2`)에 저장하면 새로고침/뒤로가기에 강해집니다.

### 동적 필드 (`useFieldArray`)

```tsx
"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  members: z
    .array(z.object({ name: z.string().min(1, "이름을 입력해주세요") }))
    .min(1, "최소 1명이 필요합니다")
    .max(5),
});
type FormData = z.infer<typeof schema>;

export function MembersForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { members: [{ name: "" }] },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members",
  });

  return (
    <form onSubmit={form.handleSubmit((d) => console.log(d))}>
      {fields.map((f, i) => (
        <Controller
          key={f.id} // ✅ index가 아닌 f.id를 key로 사용
          name={`members.${i}.name`}
          control={form.control}
          render={({ field, fieldState }) => (
            <div>
              <Input {...field} aria-invalid={fieldState.invalid} />
              {fieldState.error && (
                <p role="alert">{fieldState.error.message}</p>
              )}
              <Button type="button" variant="ghost" onClick={() => remove(i)}>
                삭제
              </Button>
            </div>
          )}
        />
      ))}
      <Button type="button" onClick={() => append({ name: "" })}>
        멤버 추가
      </Button>
      <Button type="submit">저장</Button>
    </form>
  );
}
```

### 파일 업로드 폼

Server Action은 `FormData`로 `File`을 직접 받을 수 있습니다. 대용량이거나 진행률이 필요하면 **Supabase Storage 서명 URL에 클라이언트가 직접 업로드**하는 방식을 사용하세요 (Server Action의 요청 본문 크기 제한 회피).

```typescript
// lib/schemas/upload.ts
import { z } from "zod";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ["image/png", "image/jpeg", "application/pdf"];

export const uploadSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요"),
  // z.instanceof(File)은 브라우저/Node 모두에서 동작 (서버는 Node 20+)
  file: z
    .instanceof(File, { error: "파일을 선택해주세요" })
    .refine((f) => f.size <= MAX_SIZE, "파일 크기는 5MB 이하여야 합니다")
    .refine(
      (f) => ACCEPTED.includes(f.type),
      "PNG, JPG, PDF만 업로드할 수 있습니다",
    ),
});
```

```tsx
// 파일 입력은 비제어 컴포넌트이므로 value를 넘기지 않고 onChange로 File만 전달
<Controller
  name="file"
  control={form.control}
  render={({ field: { value, onChange, ...field }, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>파일</FieldLabel>
      <Input
        {...field}
        id={field.name}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf"
        onChange={(e) => onChange(e.target.files?.[0])}
        aria-invalid={fieldState.invalid}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

```tsx
// 이미지 미리보기: URL.createObjectURL은 반드시 revoke
"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

function Preview({ file }: { file?: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file?.type.startsWith("image/")) return setUrl(null);
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl); // 메모리 누수 방지
  }, [file]);

  if (!url) return null;
  // blob: URL은 next/image 최적화 대상이 아니므로 unoptimized
  return (
    <Image src={url} alt="미리보기" width={128} height={128} unoptimized />
  );
}
```

- 서버에서도 **파일 크기/MIME 타입을 다시 검증**하세요. 확장자와 `file.type`은 클라이언트가 조작할 수 있습니다.

### 자동저장 폼

```tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDebouncedCallback } from "use-debounce";
import { saveDraftAction } from "@/lib/actions/drafts";

type Draft = { title: string; content: string };

export function AutoSaveForm({ draftId }: { draftId: string }) {
  const form = useForm<Draft>({ defaultValues: { title: "", content: "" } });

  const save = useDebouncedCallback(async (values: Draft) => {
    await saveDraftAction(draftId, values); // 서버에서 스키마 검증 필수
  }, 2000);

  useEffect(() => {
    // watch 콜백 구독: 렌더링을 유발하지 않음
    const subscription = form.watch((values) => {
      if (values.title || values.content) save(values as Draft);
    });
    return () => subscription.unsubscribe();
  }, [form, save]);

  // 이탈 시 보류 중인 저장 즉시 실행 (비동기 요청 완료는 보장되지 않음)
  useEffect(() => () => save.flush(), [save]);

  // ... Field 렌더링
}
```

- `beforeunload`에서 비동기 Server Action을 호출해도 완료가 보장되지 않습니다. 이탈 직전 저장이 중요하면 `navigator.sendBeacon` 또는 `fetch(..., { keepalive: true })`를 쓰세요.
- 자동저장 결과 표시("저장됨")는 Server Action 반환값으로 상태를 관리합니다.

## 💡 실무 팁 및 최적화

### 성능

- **`watch()`는 전체 폼 리렌더를 유발**합니다. 특정 값만 필요하면 `useWatch({ control, name })`을 해당 컴포넌트에서 사용하고, 부수효과는 `form.watch(callback)` 구독을 쓰세요.
- `mode`: 기본 `onSubmit` → UX가 필요할 때만 `onTouched`/`onChange`. 모든 키 입력 검증(`onChange`)은 큰 폼에서 비용이 큽니다.
- `resolver`는 컴포넌트 밖에서 만든 **스키마 상수**로 생성합니다. 스키마를 렌더링마다 새로 만들지 마세요.
- React Compiler를 켠 경우 `useMemo(() => zodResolver(schema))` 같은 수동 메모이제이션은 불필요합니다 ([component-patterns.md](./component-patterns.md) 참고).
- 항목이 수백 개인 동적 리스트는 `useFieldArray` + 가상화 라이브러리 조합을 고려하세요 (라이브러리 최신 문서 확인).

### 낙관적 UI와 pending 상태

```tsx
"use client";
import { useFormStatus } from "react-dom";

// <form> 의 자식으로 렌더링되어야 동작
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "처리 중..." : children}
    </button>
  );
}
```

RHF를 쓰는 경우에는 `form.formState.isSubmitting` 또는 `useActionState`의 `isPending`을 사용합니다.

### 에러 처리 패턴

- **검증 에러**: Server Action이 예외를 던지지 않고 `{ success: false, fieldErrors }`를 **반환**합니다 (기대 가능한 에러).
- **예상 못 한 에러**: 던지면 가장 가까운 `error.tsx`(`"use client"`)가 처리합니다. 폼 영역만 감싸고 싶다면 하위 라우트 세그먼트에 `error.tsx`를 두거나 `react-error-boundary`를 사용하세요.
- 사용자 메시지에 내부 에러 내용(스택, SQL 등)을 노출하지 마세요.

## ⚠️ 보안 고려사항

### Server Action 보안

- Server Action은 **공개 엔드포인트**입니다. 인증(`supabase.auth.getUser()`)과 권한 확인을 **매 액션 안에서** 수행하세요. 폼이 로그인 사용자에게만 보인다는 것은 보호 수단이 아닙니다.
- 입력은 항상 `unknown`으로 받고 `safeParse`로 재검증합니다. 클라이언트 타입 선언을 신뢰하지 마세요.
- Next.js는 Server Action 호출 시 `Origin`/`Host` 헤더를 비교해 **기본적인 CSRF 방어**를 제공합니다. 별도로 `process.env`를 클라이언트에 노출하는 수동 CSRF 토큰 구현은 하지 마세요.
- 서드파티 도메인에서 호출이 필요한 경우에만 `next.config.ts`의 `serverActions.allowedOrigins`를 설정합니다.
- `bodySizeLimit`(기본 1MB) 때문에 파일 업로드가 실패하면 설정을 올리기보다 스토리지 직접 업로드를 먼저 고려하세요.

### Rate Limiting

로그인·가입·비밀번호 재설정처럼 남용 위험이 큰 액션에는 요청 제한을 둡니다.

```typescript
// lib/rate-limit.ts
import { headers } from "next/headers";

// ⚠️ 메모리 기반 구현은 서버리스/다중 인스턴스에서 인스턴스마다 따로 계산되어 불완전합니다.
// 운영 환경에서는 Redis 등 외부 저장소 기반(예: Upstash Ratelimit)을 사용하세요.
const hits = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
) {
  const now = Date.now();
  const record = hits.get(key);

  if (!record || now > record.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count++;
  return true;
}

export async function getClientKey() {
  const h = await headers();
  // 프록시 뒤에서는 x-forwarded-for의 첫 번째 값이 클라이언트 IP
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
```

```typescript
// Server Action에서 사용
export async function loginAction(_prev: ActionResult, input: unknown) {
  if (!(await checkRateLimit(`login:${await getClientKey()}`))) {
    return {
      success: false,
      message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
    } as const;
  }
  // ...
}
```

## ❌ 안티패턴 및 금지사항

```tsx
// ❌ 모든 입력을 useState로 관리 → 키 입력마다 전체 리렌더
const [data, setData] = useState({});
<input onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))} />;

// ✅ RHF 사용 (비제어 방식으로 리렌더 최소화)
const { register, handleSubmit } = useForm();
<input {...register("name")} />;
```

```tsx
// ❌ 클라이언트 검증만 수행하고 서버 검증 없음
await fetch("/api/submit", { method: "POST", body: JSON.stringify(data) });

// ✅ 클라이언트(UX) + 서버(보안) 이중 검증, 같은 스키마 공유
// client: zodResolver(schema)   server: schema.safeParse(input)
```

```tsx
// ❌ useActionState의 상태를 useEffect로 RHF에 복사
useEffect(() => { Object.entries(state.errors).forEach(([k, v]) => form.setError(k, ...)) }, [state]);

// ✅ handleSubmit 안에서 dispatch를 호출하고, 에러는 렌더 시점에 읽어 표시
```

```tsx
// ❌ Zod 3 문법 (Zod 4에서 deprecated)
z.string().email();
err.flatten().fieldErrors;
a.merge(b);

// ✅ Zod 4
z.email();
z.flattenError(err).fieldErrors;
z.object({ ...a.shape, ...b.shape });
```

```tsx
// ❌ index를 key로 사용하는 동적 필드
fields.map((f, i) => <Row key={i} />);

// ✅ useFieldArray가 제공하는 고유 id
fields.map((f, i) => <Row key={f.id} />);
```

```tsx
// ❌ redirect()를 try/catch로 감싸기 (내부 예외가 삼켜져 리다이렉트 실패)
try {
  await save();
  redirect("/done");
} catch {}

// ✅ try/catch 밖에서 호출
try {
  await save();
} catch {
  return { success: false, message: "..." };
}
redirect("/done");
```

## 🎯 체크리스트

### 필수

- [ ] 패키지 설치 확인 (`react-hook-form`, `@hookform/resolvers`, `zod`)
- [ ] Zod 스키마를 `lib/schemas/`에 정의하고 클라이언트/서버가 **공유**
- [ ] Server Action에서 `safeParse`로 **재검증** (입력은 `unknown`으로 수신)
- [ ] Server Action 안에서 인증/인가 확인
- [ ] 로딩 상태 UI (`isPending` / `isSubmitting` / `useFormStatus`)
- [ ] 필드 에러 표시 + 접근성 속성 (`aria-invalid`, `role="alert"`, `FieldLabel htmlFor`)
- [ ] 남용 가능한 액션에 Rate limiting 적용
- [ ] Zod 4 문법 사용 (`z.email()`, `z.flattenError`, `{ error }`)

### 권장

- [ ] 단순 폼은 RHF 없이 `<form action>` + `useActionState` 검토
- [ ] 변환(`coerce`/`transform`) 사용 시 `useForm<Input, unknown, Output>` 제네릭 명시
- [ ] 동적 필드는 `useFieldArray` + `key={field.id}`
- [ ] 파일 업로드는 서버에서 크기/MIME 재검증, 미리보기 URL은 `revokeObjectURL`
- [ ] 자동저장/구독 `useEffect`에 cleanup 포함
- [ ] 다단계 폼은 단계별 `useForm` + URL 단계 상태 고려

### 코드 품질

- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] 불필요한 리렌더링 없음 (`useWatch` 범위 최소화)

## 🔗 관련 리소스

- [React Hook Form 공식 문서](https://react-hook-form.com/) — Advanced Usage의 "Server Actions / useActionState"
- [@hookform/resolvers](https://github.com/react-hook-form/resolvers)
- [Zod 공식 문서 (v4)](https://zod.dev/)
- [shadcn/ui + React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Next.js: Forms 가이드](https://nextjs.org/docs/app/guides/forms)

이 가이드를 따라 타입 안전하고 안전한 폼을 구현하세요.
