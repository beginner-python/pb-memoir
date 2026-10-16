import { Lock } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** READ_ONLY=true のときに書き込み操作の近くに置く説明 */
export function ReadOnlyNotice() {
  return (
    <Alert>
      <Lock aria-hidden />
      <AlertTitle>このデモは読み取り専用です</AlertTitle>
      <AlertDescription>
        日記の作成・編集・削除はできません。閲覧と「思い出を聞く」はお試しいただけます。
      </AlertDescription>
    </Alert>
  );
}
