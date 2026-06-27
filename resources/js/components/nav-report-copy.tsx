import { usePage } from '@inertiajs/react';
import { Check, ClipboardCopy, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ReportType = 'semua' | 'progres' | 'komentar';

const TABS: { key: ReportType; label: string }[] = [
    { key: 'semua', label: 'Semua' },
    { key: 'progres', label: 'Progres' },
    { key: 'komentar', label: 'Komentar' },
];

const ENDPOINTS: Record<
    'progres' | 'komentar',
    { endpoint: string; fallback: string }
> = {
    progres: { endpoint: '/reports/export', fallback: 'progres.txt' },
    komentar: { endpoint: '/komentar/export', fallback: 'riport.txt' },
};

const fetchReport = (kind: 'progres' | 'komentar', date: string) =>
    fetch(`${ENDPOINTS[kind].endpoint}?date=${encodeURIComponent(date)}`, {
        headers: { Accept: 'application/json' },
    }).then((r) => r.json());

export function NavReportCopy() {
    const today = usePage().props.today;

    const [open, setOpen] = useState(false);
    const [type, setType] = useState<ReportType>('semua');
    const [date, setDate] = useState(today);
    const [text, setText] = useState('');
    const [filename, setFilename] = useState('laporan.txt');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const load = async (t: ReportType, d: string) => {
        setLoading(true);
        setCopied(false);
        try {
            if (t === 'semua') {
                const [p, k] = await Promise.all([
                    fetchReport('progres', d),
                    fetchReport('komentar', d),
                ]);
                const progres = (p.text ?? '').trimEnd();
                const komentar = (k.text ?? '').trimEnd();
                setText(`${progres}\n\n──────────\n\n${komentar}\n`);
                setFilename(`laporan-${d}.txt`);
            } else {
                const data = await fetchReport(t, d);
                setText(data.text ?? '');
                setFilename(data.filename ?? ENDPOINTS[t].fallback);
            }
        } catch {
            setText('Gagal memuat laporan. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const openDialog = () => {
        setType('semua');
        setDate(today);
        setOpen(true);
        load('semua', today);
    };

    const switchType = (t: ReportType) => {
        if (t === type) return;
        setType(t);
        load(t, date);
    };

    const onDate = (d: string) => {
        setDate(d);
        if (d) load(type, d);
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success(
                type === 'progres'
                    ? 'Progres disalin.'
                    : type === 'komentar'
                      ? 'Komentar disalin.'
                      : 'Laporan disalin.',
            );
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Gagal menyalin ke clipboard.');
        }
    };

    const download = () => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <SidebarGroup className="pb-1">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={openDialog}
                            tooltip="Salin Laporan"
                            className="!bg-lux-teal font-semibold !text-white shadow-sm shadow-lux-teal/30 hover:!bg-lux-teal-dark hover:!text-white active:!bg-lux-teal-dark active:!text-white"
                        >
                            <ClipboardCopy />
                            <span>Salin Laporan</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Salin Laporan Harian</DialogTitle>
                        <DialogDescription>
                            Salin progres target & komentar yang Anda lakukan
                            pada tanggal tertentu, siap ditempel ke chat.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* report type toggle */}
                        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => switchType(tab.key)}
                                    className={cn(
                                        'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
                                        type === tab.key
                                            ? 'bg-white text-foreground shadow-sm dark:bg-white/10'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                            <div className="grid gap-2">
                                <Label className="text-sm font-medium text-foreground/80">
                                    Tanggal
                                </Label>
                                <DatePicker
                                    value={date}
                                    onChange={onDate}
                                    className="w-44"
                                />
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={copy}
                                    disabled={loading || !text}
                                    className="gap-1.5"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    {copied ? 'Tersalin' : 'Salin'}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={download}
                                    disabled={loading || !text}
                                    className="gap-1.5"
                                >
                                    <Download className="h-4 w-4" />
                                    Unduh .txt
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            {loading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60">
                                    <Spinner />
                                </div>
                            )}
                            <Textarea
                                readOnly
                                value={text}
                                rows={15}
                                className="rounded-xl border-border bg-white/60 font-mono text-xs leading-relaxed whitespace-pre shadow-none focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Tutup
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
