import { Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PayrollCalculatorTabs from "./PayrollCalculatorTabs";

interface Props { open: boolean; onClose: () => void; }

export default function PayrollCalculatorModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" /> Payroll Calculator
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1">
          <PayrollCalculatorTabs />
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
