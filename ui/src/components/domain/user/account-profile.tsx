import { Badge } from '@/components/custom/badge';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { queryKeys } from '@/hooks/query';
import { cn } from '@/lib/utils';
import { roleBadgeVariant, USER_ROLE_LABELS } from '@/utils/auth';
import { $api, fetchClient } from '@services/openapi/client';
import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';

export default function AccountProfile() {
    const { data: user } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        { params: { path: { user_id: 'me' } } },
        { meta: { suppressNotification: true } },
    );

    const { data: memberships } = useQuery({
        queryKey: queryKeys.teams.user('me'),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/users/me/teams/');
            if (error) throw { response, error };
            return data;
        },
        meta: { suppressNotification: true },
    });

    if (!user) return null;

    const fields = [
        {
            label: 'ID',
            description: 'Unique identifier of your account',
            value: user.id ?? '',
            mono: true,
        },
        {
            label: 'Username',
            description: 'Display name across the platform',
            value: user.username,
        },
        {
            label: 'Email',
            description: 'Used for login and notifications',
            value: user.email ?? '',
        },
        ...(user.role
            ? [
                  {
                      label: 'Role',
                      description:
                          'Your platform-wide role, assigned by an administrator',
                      value: USER_ROLE_LABELS[user.role],
                      variant: roleBadgeVariant(user.role),
                  },
              ]
            : []),
    ];

    return (
        <section id='profile'>
            <FieldGroup className='gap-4'>
                {fields.map((field, index) => (
                    <Fragment key={field.label}>
                        {index > 0 && <Separator />}
                        <Field orientation='responsive'>
                            <FieldContent>
                                <FieldLabel className='text-sm block'>
                                    {field.label}
                                </FieldLabel>
                                <FieldDescription>{field.description}</FieldDescription>
                            </FieldContent>
                            <div className='flex w-80 max-w-full shrink-0 self-start md:self-center'>
                                <Badge
                                    variant={field.variant ?? 'outline'}
                                    title={field.value}
                                    className={cn(
                                        'max-w-full',
                                        field.mono && 'font-mono',
                                    )}
                                >
                                    <span className='truncate'>{field.value}</span>
                                </Badge>
                            </div>
                        </Field>
                    </Fragment>
                ))}
                {memberships && memberships.length > 0 && (
                    <>
                        <Separator />
                        <Field orientation='responsive'>
                            <FieldContent>
                                <FieldLabel className='text-sm block'>
                                    {memberships.length === 1 ? 'Team' : 'Teams'}
                                </FieldLabel>
                                <FieldDescription>
                                    Teams you belong to and your role in each
                                </FieldDescription>
                            </FieldContent>
                            <div className='flex w-80 max-w-full shrink-0 flex-wrap gap-1.5 self-start md:self-center'>
                                {memberships.map((membership) => (
                                    <Badge key={membership.team.id} variant='outline'>
                                        {membership.team.name}
                                        {membership.role === 'lead' && (
                                            <span className='text-muted-foreground'>
                                                · Lead
                                            </span>
                                        )}
                                    </Badge>
                                ))}
                            </div>
                        </Field>
                    </>
                )}
            </FieldGroup>
        </section>
    );
}
