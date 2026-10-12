# React Hook Form + Zod + Server Actions 가이드

이 문서는 Next.js 16 / React 19.3 환경에서 React Hook Form(RHF), Zod 4, Server Actions로 폼을 만드는 패턴을 정리합니다.

## 현재 상태와 설치

`react-hook-form`, `@hookform/resolvers`는 아직 `package.json`에 없습니다. `zod`는 다른 패키지의 하위 의존성으로만 존재하므로, 폼을 만들 때 직접 설치합니다.

```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn@latest add form      # components/ui/form.tsx 추가 (현재 없음)
```

- Zod는 **v4** 기준입니다 (`@hookform/resolvers` v5 이상이 Zod 4를 지원).
- 현재 로그인/회원가입 폼(`components/login-form.tsx` 등)은 RHF 없이 Supabase 클라이언트를 직접 호출합니다. 새 폼부터 이 가이드를 적용하고, 기존 폼은 필요할 때 옮깁니다.
- 인증은 Supabase Auth가 담당합니다. 아래 예시의 인증 로직은 직접 구현하지 말고 `lib/supabase/server.ts`의 클라이언트를 사용하세요.

## 핵심 원칙

1. **스키마 하나를 클라이언트와 서버가 공유**한다 (`lib/schemas/*.ts`, `"use client"`/`"use server"` 없는 순수 모듈).
2. **서버에서 반드시 다시 검증**한다. 클라이언트 검증은 UX용이다.
3. **Server Action은 공개 HTTP 엔드포인트**다. 인증/인가를 Action 안에서 직접 확인한다.
4. 사용자 입력 오류는 예외가 아니라 **반환값**으로 돌려준다.

## 스키마 정의 (Zod 4)

```ts
// lib/schemas/auth.ts
import { z } from "zod";

export const emailSchema = z.email("올바른 이메일 형식이 아닙니다");

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다")
  .regex(/[a-z]/, "소문자를 포함해야 합니다")
  .regex(/[A-Z]/, "대문자를 포함해야 합니다")
  .regex(/\d/, "숫자를 포함해야 합니다");

export const signUpSchema = z
  .object({
    name: z.string().min(2, "이름은 2자 이상이어야 합니다").max(50),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    terms: z.literal(true, { error: "이용약관에 동의해주세요" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
```

Zod 4 변경점:

| Zod 3 | Zod 4 |
| --- | --- |
| `z.string().email()` | `z.email()` (기존 방식은 deprecated) |
| `z.string().uuid()`, `.url()` | `z.uuid()`, `z.url()` |
| `{ message: "..." }`, `required_error`, `invalid_type_error` | `{ error: "..." }` (문자열 또는 함수) |
| `error.flatten()`, `error.format()` | `z.flattenError(error)`, `z.treeifyError(error)` |
| `z.boolean().refine(v => v === true)` | `z.literal(true, { error })` |

`FormData`는 모든 값이 문자열(또는 `File`)이므로 숫자/날짜는 `z.coerce.number()` 등으로 변환하고, 체크박스는 `formData.get("terms") === "on"`처럼 먼저 boolean으로 바꾼 뒤 스키마에 넘깁니다.

## Server Action

```ts
// app/<route>/actions.ts
"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/schemas/profile";

export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // 1. 서버 검증
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    website: formData.get("website"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "입력값을 확인해주세요",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // 2. 인증 확인 (Action은 누구나 호출할 수 있다)
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { ok: false, message: "로그인이 필요합니다" };

  // 3. 변경 (public.profiles: full_name, username, website 등. RLS가 한 번 더 막아준다)
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, website: parsed.data.website })
    .eq("id", userId);
  if (error) return { ok: false, message: "저장하지 못했습니다" };

  // 4. 같은 요청에서 최신 값을 보여주려면 updateTag
  updateTag(`profile-${userId}`);
  return { ok: true, message: "저장되었습니다" };
}
```

규칙:

- `redirect()`는 내부적으로 예외를 던지므로 `try/catch` 밖에서 호출한다.
- DB/내부 에러 메시지를 사용자에게 그대로 반환하지 않는다.
- 캐시 무효화는 Server Action에서는 `updateTag`(즉시), 지연이 허용되면 `revalidateTag(tag, "max")`를 쓴다. 두 번째 인자 없는 `revalidateTag`는 deprecated다.
- 응답 후 처리(로그, 알림)는 `after()`(`next/server`)로 넘긴다.
- Server Action은 POST로만 호출되고 Next.js가 `Origin`/`Host` 헤더를 검증하므로, 별도의 자체 CSRF 토큰을 만들지 않는다. 프록시 뒤에서 호스트가 달라지면 `serverActions.allowedOrigins`를 설정한다.
- 접근 권한은 **Supabase RLS가 최종 방어선**이다. Action의 인증 확인만 믿지 않는다.

## 폼 컴포넌트: RHF + `useActionState`

```tsx
// components/profile-form.tsx
"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { profileSchema, type ProfileValues } from "@/lib/schemas/profile";
import { updateProfileAction, type ActionState } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const initialState: ActionState = { ok: false, message: "" };

export function ProfileForm({ defaultValues }: { defaultValues: ProfileValues }) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: "onBlur",
  });

  // 서버 검증 오류를 필드에 반영
  useEffect(() => {
    if (!state.fieldErrors) return;
    for (const [name, messages] of Object.entries(state.fieldErrors)) {
      form.setError(name as keyof ProfileValues, { type: "server", message: messages?.[0] });
    }
  }, [state.fieldErrors, form]);

  const onSubmit = form.handleSubmit((values) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) formData.set(key, String(value ?? ""));
    // 액션은 반드시 transition 안에서 호출한다 (isPending 연동, React 경고 방지)
    startTransition(() => formAction(formData));
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {state.message && (
          <p role="status" className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </form>
    </Form>
  );
}
```

포인트:

- 클라이언트 검증이 필요 없는 단순 폼은 RHF 없이 `<form action={formAction}>`만으로 충분하다. 이 경우 JS 없이도 제출되고 `defaultValue`로 이전 입력을 유지한다.
- `isPending` 대신 자식 컴포넌트에서 `useFormStatus()`로 제출 버튼 상태만 구독할 수도 있다.
- 입력값이 서버 오류 후 초기화되는 React 19의 `<form action>` 동작을 피하려면 RHF처럼 값을 직접 관리하거나, Action이 입력값을 `state`로 되돌려주어 `defaultValue`에 사용한다.
- 성공 시 이동이 필요하면 Action에서 `redirect()` 한다 (`try/catch` 밖).

## 고급 패턴

### 다단계 폼

단계별 스키마를 두고, `trigger()`로 현재 단계 필드만 검증한 뒤 다음 단계로 이동합니다. 최종 제출 시에는 모든 단계를 합친 스키마로 서버에서 다시 검증합니다.

```tsx
const steps = [
  { fields: ["name", "email"] as const },
  { fields: ["address", "city"] as const },
];

const next = async () => {
  const ok = await form.trigger(steps[step].fields);
  if (ok) setStep((s) => s + 1);
};
```

- 하나의 `useForm`(전체 스키마)을 유지하고 단계만 UI로 나눈다. 단계마다 `useForm`을 새로 만들면 값이 사라진다.
- 단계 상태를 URL(`?step=2`)에 두면 새로고침/뒤로가기에 강해진다. Cache Components에서는 `useSearchParams`를 쓰는 컴포넌트를 `Suspense`로 감싼다.

### 파일 업로드

파일은 Server Action에 `FormData`로 직접 보내지 말고, **Supabase Storage에 클라이언트에서 직접 업로드**하는 방식을 우선 검토합니다 (Server Action 본문 크기 기본 제한은 1MB, `serverActions.bodySizeLimit`로 조정).

```ts
const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= 5 * 1024 * 1024, { error: "5MB 이하만 업로드할 수 있습니다" })
  .refine((f) => ["image/png", "image/jpeg", "image/webp"].includes(f.type), { error: "이미지 파일만 가능합니다" });
```

- `File` 검증은 브라우저와 서버 모두에서 한다. MIME 타입은 위조 가능하므로 서버(또는 Storage 정책)에서도 제한한다.
- Storage 버킷에는 RLS 정책을 설정하고, 파일 경로에 `user_id`를 포함시킨다.

### 자동 저장(Autosave)

`form.watch` 대신 `useWatch`로 필요한 값만 구독하고, 디바운스는 직접 작성하거나 `use-debounce`를 사용합니다.

```tsx
const values = useWatch({ control: form.control });
const debounced = useDebounce(values, 1000);

useEffect(() => {
  if (!form.formState.isDirty) return;
  startTransition(() => void saveDraftAction(debounced));
}, [debounced, form.formState.isDirty]);
```

- 자동 저장 Action도 일반 Action과 동일하게 서버 검증과 인증 확인을 한다 (초안용 느슨한 스키마를 `.partial()`로 만들 수 있다).
- Effect 안에서 구독/타이머를 만들면 cleanup을 작성한다 (`<Activity>`로 숨겨지면 Effect가 정리된다).

## 보안

- **서버 재검증, 인증, RLS**: 위 Action 예시의 1~3단계를 모든 변경 Action에 적용한다.
- **Rate limiting**: 모듈 전역 `Map` 기반 구현은 서버리스/다중 인스턴스에서 공유되지 않아 효과가 없다. 인증 관련 제한은 Supabase Auth의 rate limit 설정을 우선 사용하고, 그 외에는 Redis 등 외부 저장소 기반 제한을 쓴다. IP는 `x-forwarded-for` 첫 번째 값을 신뢰할 수 있는 프록시 환경에서만 사용한다.
- **민감 정보 반환 금지**: 오류 메시지에 계정 존재 여부, SQL 오류 등을 노출하지 않는다.
- **`NEXT_PUBLIC_` 변수**는 브라우저에 노출된다. 비밀 키는 서버 전용 환경 변수에 둔다.

## 안티패턴

```tsx
// 금지: 클라이언트 검증만 수행하고 서버 검증 없음
// 금지: 입력마다 전체 객체를 setState (RHF 사용 또는 비제어 입력)
// 금지: Action을 transition 밖에서 직접 호출 (startTransition 필수)
// 금지: Action 안에서 인증/권한 확인 생략
// 금지: try/catch 안에서 redirect() 호출
// 금지: 사용자 입력 오류를 throw로 처리 (반환값 사용)
// 금지: 서버 전용 모듈(lib/supabase/server)을 폼 컴포넌트에서 import
// 금지: 사용자 데이터를 'use cache'로 캐시
```

## 체크리스트

**필수**
- [ ] 스키마를 `lib/schemas/`에서 클라이언트·서버가 공유
- [ ] Zod 4 API 사용 (`z.email()`, `{ error }`, `z.flattenError`)
- [ ] Server Action에서 `safeParse` + 인증 확인
- [ ] 테이블에 RLS 정책 적용
- [ ] 로딩(`isPending`)과 오류 메시지 UI
- [ ] 접근성: `<label>` 연결, `aria-invalid`, `role="status"`/`role="alert"`

**권장**
- [ ] 변경 후 `updateTag` / `revalidateTag(tag, "max")`
- [ ] 파일 업로드는 Storage 직접 업로드 + 크기/형식 제한
- [ ] 다단계/자동 저장 폼의 Effect cleanup

**품질**
- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`

## 참고

- 번들 문서: `node_modules/next/dist/docs/01-app/02-guides/forms.md`, `server-actions.md`, `data-security.md`
- [React Hook Form](https://react-hook-form.com/), [Zod 4](https://zod.dev/), [shadcn/ui Form](https://ui.shadcn.com/docs/components/form)
