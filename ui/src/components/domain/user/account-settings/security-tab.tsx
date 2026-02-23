import { Button } from '@/components/ui/button';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';

interface SecurityTabProps {
    twoFactorEnabled: boolean;
    onChangePassword: () => void;
    onGenerateApiKey: () => void;
    onToggleTwoFactor: () => void;
    onDeleteAccount: () => void;
}

export default function SecurityTab({
    twoFactorEnabled,
    onChangePassword,
    onGenerateApiKey,
    onToggleTwoFactor,
    onDeleteAccount,
}: SecurityTabProps) {
    return (
        <section id='security'>
            <div className='flex flex-col gap-4'>
                <FieldGroup className='gap-4'>
                    <Field orientation='horizontal' className='gap-2'>
                        <FieldContent className='flex-1'>
                            <FieldLabel className='text-sm block mb-0.5'>
                                Password
                            </FieldLabel>
                            <FieldDescription>
                                Change your account password
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='self-center'
                            onClick={onChangePassword}
                            title='Change Password'
                        >
                            Change
                        </Button>
                    </Field>

                    <Separator />

                    <Field orientation='horizontal' className='gap-2'>
                        <FieldContent className='flex-1'>
                            <FieldLabel className='text-sm block mb-0.5'>
                                API Key
                            </FieldLabel>
                            <FieldDescription>
                                Generate key for API access
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='self-center'
                            onClick={onGenerateApiKey}
                            title='Generate API Key'
                        >
                            Generate
                        </Button>
                    </Field>

                    <Separator />

                    <Field orientation='horizontal' className='gap-2'>
                        <FieldContent className='flex-1'>
                            <FieldLabel className='text-sm block mb-0.5'>
                                Two-Factor Auth
                            </FieldLabel>
                            <FieldDescription>
                                Protect your account with one-time codes from an
                                authenticator app
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant={twoFactorEnabled ? 'destructive' : 'outline'}
                            size='sm'
                            className='self-center'
                            onClick={onToggleTwoFactor}
                        >
                            {twoFactorEnabled ? 'Disable' : 'Enable'}
                        </Button>
                    </Field>

                    <Separator />

                    <Field orientation='horizontal' className='gap-2'>
                        <FieldContent className='flex-1'>
                            <FieldLabel className='text-sm block mb-0.5'>
                                Delete Account
                            </FieldLabel>
                            <FieldDescription>
                                Permanently remove account and data
                            </FieldDescription>
                        </FieldContent>
                        <Button
                            type='button'
                            variant='destructive'
                            size='sm'
                            className='self-center'
                            onClick={onDeleteAccount}
                        >
                            Delete
                        </Button>
                    </Field>
                </FieldGroup>
            </div>
        </section>
    );
}
