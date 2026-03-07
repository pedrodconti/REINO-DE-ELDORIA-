import { Toaster as Sonner } from 'sonner';

function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: '!bg-card !border !border-border !text-card-foreground',
        },
      }}
    />
  );
}

export { Toaster };
