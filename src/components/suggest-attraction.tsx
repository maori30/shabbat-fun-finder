import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { suggestAttraction } from "@/lib/suggest.functions";

const ageOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
};

export function SuggestAttraction() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const suggestFn = useServerFn(suggestAttraction);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const shabbat = String(fd.get("open_shabbat") ?? "");
    const env = String(fd.get("environment") ?? "");
    setLoading(true);
    try {
      const res = await suggestFn({
        data: {
          name: String(fd.get("name") ?? ""),
          city: String(fd.get("city") ?? ""),
          description: String(fd.get("description") ?? ""),
          openShabbat: shabbat === "yes" ? true : shabbat === "no" ? false : null,
          environment: env === "ממוזג" || env === "פתוח" || env === "משולב" ? env : null,
          minAge: ageOrNull(fd.get("min_age")),
          maxAge: ageOrNull(fd.get("max_age")),
          stroller_accessible: fd.get("stroller_accessible") === "true",
          changing_table: fd.get("changing_table") === "true",
          easy_parking: fd.get("easy_parking") === "true",
          website: String(fd.get("website") ?? ""),
        },
      });
      if (res.ok) {
        toast.success("תודה! ההצעה נשלחה ותיבדק בקרוב 🙏");
        form.reset();
        setOpen(false);
      } else {
        toast.error(res.error ?? "הייתה בעיה בשליחת ההצעה, נסו שוב.");
      }
    } catch (err) {
      console.error(err);
      toast.error("הייתה בעיה בשליחת ההצעה, נסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          + מכירים מקום פתוח בשבת? הוסיפו אותו
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הצעת אטרקציה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Honeypot: hidden from people, bots tend to fill it. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <div>
            <Label htmlFor="name">שם המקום / האירוע</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="למשל: יריד האומנים בקיבוץ"
            />
          </div>
          <div>
            <Label htmlFor="city">עיר או יישוב</Label>
            <Input
              id="city"
              name="city"
              required
              minLength={2}
              maxLength={80}
              placeholder="למשל: פרדס חנה"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="open_shabbat">פתוח בשבת?</Label>
              <select
                id="open_shabbat"
                name="open_shabbat"
                defaultValue="yes"
                className="glass-select mt-1 w-full rounded-md px-2 py-2 text-sm"
              >
                <option value="yes">כן</option>
                <option value="no">לא</option>
                <option value="unknown">לא בטוח/ה</option>
              </select>
            </div>
            <div>
              <Label htmlFor="environment">סוג המקום</Label>
              <select
                id="environment"
                name="environment"
                defaultValue=""
                className="glass-select mt-1 w-full rounded-md px-2 py-2 text-sm"
              >
                <option value="">לא ידוע</option>
                <option value="ממוזג">ממוזג / בפנים</option>
                <option value="פתוח">בחוץ</option>
                <option value="משולב">משולב</option>
              </select>
            </div>
            <div>
              <Label htmlFor="min_age">מגיל</Label>
              <Input
                id="min_age"
                name="min_age"
                type="number"
                min={0}
                max={18}
                inputMode="numeric"
              />
            </div>
            <div>
              <Label htmlFor="max_age">עד גיל</Label>
              <Input
                id="max_age"
                name="max_age"
                type="number"
                min={0}
                max={18}
                inputMode="numeric"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">כמה מילים על המקום</Label>
            <Textarea
              id="description"
              name="description"
              maxLength={1000}
              placeholder="מה יש שם? שעות פתיחה? מחיר?"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="stroller_accessible"
                value="true"
                className="h-4 w-4 accent-primary"
              />
              ♿ נגיש לעגלות
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="changing_table"
                value="true"
                className="h-4 w-4 accent-primary"
              />
              🍼 יש פינת החתלה
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="easy_parking"
                value="true"
                className="h-4 w-4 accent-primary"
              />
              🅿️ חניה נוחה בשבת
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "שולח..." : "שליחה לאישור"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
