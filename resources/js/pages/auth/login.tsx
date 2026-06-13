import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { home } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

const inputClasses =
    'h-11 rounded-xl border-border bg-white/60 px-3.5 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 dark:bg-white/5';

const labelClasses = 'text-sm font-medium text-foreground/80';

export default function Login({ status, canResetPassword }: Props) {
    return (
        <div className="flex min-h-dvh items-center justify-center px-6 py-12 antialiased">
            <Head title="Masuk — WorkReport" />

            <div className="w-full max-w-md">
                <div className="glass-card rounded-3xl p-8 shadow-xl sm:p-10">
                    {/* brand */}
                    <Link
                        href={home()}
                        className="mb-8 flex items-center justify-center gap-2.5"
                    >
                        <AppLogoIcon className="size-12 shrink-0" />
                        <span className="leading-tight">
                            <span className="block text-lg font-bold tracking-tight">
                                WorkReport
                            </span>
                            <span className="block text-[10px] font-semibold tracking-[0.2em] text-lux-teal-dark uppercase dark:text-lux-teal">
                                Pelaporan Engagement
                            </span>
                        </span>
                    </Link>

                    {/* header */}
                    <div className="mb-7 text-center">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Masuk ke akun Anda
                        </h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Gunakan kredensial tim Anda untuk mengakses dasbor.
                        </p>
                    </div>

                    {status && (
                        <div className="mb-6 rounded-xl border border-lux-teal/30 bg-lux-teal-light/40 px-4 py-3 text-sm font-medium text-lux-teal-dark">
                            {status}
                        </div>
                    )}

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password']}
                        className="flex flex-col gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                {/* email */}
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className={labelClasses}>
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="nama@email.com"
                                        className={inputClasses}
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                {/* password */}
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <Label
                                            htmlFor="password"
                                            className={labelClasses}
                                        >
                                            Kata sandi
                                        </Label>
                                        {canResetPassword && (
                                            <Link
                                                href={request()}
                                                tabIndex={5}
                                                className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-lux-teal-dark hover:underline dark:hover:text-lux-teal"
                                            >
                                                Lupa kata sandi?
                                            </Link>
                                        )}
                                    </div>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Masukkan kata sandi"
                                        className={inputClasses}
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                {/* remember */}
                                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
                                    <Checkbox
                                        id="remember"
                                        name="remember"
                                        tabIndex={3}
                                        className="border-border data-[state=checked]:border-lux-teal data-[state=checked]:bg-lux-teal"
                                    />
                                    Ingat saya di perangkat ini
                                </label>

                                {/* submit */}
                                <button
                                    type="submit"
                                    tabIndex={4}
                                    disabled={processing}
                                    data-test="login-button"
                                    className="group mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#16c2ad] to-lux-teal-dark text-sm font-semibold text-white shadow-lg shadow-lux-teal/25 transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? (
                                        <Spinner />
                                    ) : (
                                        <>
                                            Masuk
                                            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </Form>
                </div>

                {/* helper */}
                <p className="mx-auto mt-6 max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
                    Akun dibuat oleh administrator. Hubungi pemimpin tim Anda jika
                    Anda belum memiliki kredensial.
                </p>
            </div>
        </div>
    );
}
