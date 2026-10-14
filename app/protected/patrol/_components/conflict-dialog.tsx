import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConflictDialogProps {
  open: boolean;
  onChooseLocal: () => void;
  onChooseServer: () => void;
}

// 저장 충돌 시 어느 내용을 쓸지 고르는 다이얼로그 (반드시 둘 중 하나를 선택해야 닫힌다)
export function ConflictDialog({
  open,
  onChooseLocal,
  onChooseServer,
}: ConflictDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>다른 기기에서 수정됨</AlertDialogTitle>
          <AlertDialogDescription>
            다른 기기에서 수정됨, 어느 쪽을 쓸까요?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-12" onClick={onChooseLocal}>
            이 기기 내용
          </AlertDialogCancel>
          <AlertDialogAction className="min-h-12" onClick={onChooseServer}>
            서버 내용
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
