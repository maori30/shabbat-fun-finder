import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function SuggestAttraction() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      city: formData.get('city') as string,
      description: formData.get('description') as string,
      stroller_accessible: formData.get('stroller_accessible') === 'true',
      changing_table: formData.get('changing_table') === 'true',
      easy_parking: formData.get('easy_parking') === 'true',
      is_approved: false // Requires admin approval
    };

    const { error } = await supabase.from('external_attractions').insert([data]);

    setLoading(false);
    if (error) {
      toast.error('הייתה בעיה בשליחת ההצעה, נסו שוב.');
    } else {
      toast.success('תודה! ההצעה שלך נשלחה ותיבדק בקרוב.');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4">
          + מכירים מקום פתוח בשבת? הוסיפו אותו
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>הצעת אטרקציה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name">שם המקום / האירוע</Label>
            <Input id="name" name="name" required placeholder="למשל: יריד האומנים בקיבוץ" />
          </div>
          <div>
            <Label htmlFor="city">עיר או יישוב</Label>
            <Input id="city" name="city" required placeholder="למשל: פרדס חנה" />
          </div>
          <div>
            <Label htmlFor="description">כמה מילים על המקום</Label>
            <Textarea id="description" name="description" placeholder="מה יש שם? לאיזה גיל זה מתאים?" />
          </div>
          
          <div className="flex flex-col gap-2 pt-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="stroller_accessible" value="true" className="rounded border-gray-300 text-primary focus:ring-primary" />
              ♿ נגיש לעגלות
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="changing_table" value="true" className="rounded border-gray-300 text-primary focus:ring-primary" />
              🍼 יש פינת החתלה
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="easy_parking" value="true" className="rounded border-gray-300 text-primary focus:ring-primary" />
              🅿️ חניה נוחה בשבת
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'שולח...' : 'שליחה לאישור'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

