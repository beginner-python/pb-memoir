import { AlertCircle } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ErrorAlert({
  message,
  onRetry,
  title = "読み込めませんでした",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button size="sm" variant="outline" onClick={onRetry}>
            再試行
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
