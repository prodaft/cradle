import * as React from 'react';

import { SelectContent as SelectContentBase } from '@/components/ui/select';

// Open the list below the trigger instead of shadcn's default of overlaying it on the
// selected item.
function SelectContent({
    alignItemWithTrigger = false,
    ...props
}: React.ComponentProps<typeof SelectContentBase>) {
    return <SelectContentBase alignItemWithTrigger={alignItemWithTrigger} {...props} />;
}

export { SelectContent };
