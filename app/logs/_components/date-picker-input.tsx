"use client";

import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

interface DatePickerInputProps {
  /** 현재 표시 중인 영업일 (YYYY-MM-DD) */
  date: string;
  /** 이동할 수 있는 마지막 날짜 (YYYY-MM-DD). 이보다 큰 값은 이동하지 않는다. */
  max: string;
}

// 날짜를 고르면 바로 ?date=YYYY-MM-DD 로 이동하는 입력. 값이 비어 있거나 max를 넘으면 이동하지 않는다.
export function DatePickerInput({ date, max }: DatePickerInputProps) {
  const router = useRouter();

  return (
    <Input
      type="date"
      name="date"
      value={date}
      max={max}
      aria-label="이동할 날짜"
      // appearance-none: iOS Safari의 네이티브 날짜 입력란은 border-box를 무시하고 패딩·테두리를 폭에 더해 옆 버튼과 겹친다
      className="h-12 w-full max-w-full min-w-0 appearance-none"
      onChange={(event) => {
        const value = event.target.value;
        // max 속성은 직접 입력한 값을 막지 못하는 브라우저가 있어 여기서도 거른다(YYYY-MM-DD는 문자열 비교가 날짜 순서와 같다)
        if (!value || value > max) return;
        router.push(`/logs?date=${value}`);
      }}
    />
  );
}
