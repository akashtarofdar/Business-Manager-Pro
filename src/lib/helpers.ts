export const safeParse = (val: unknown): number => {
  if (val === undefined || val === null || val === '') return 0;
  const num = parseFloat(String(val));
  return isNaN(num) ? 0 : num;
};

export const formatCurrency = (amount: unknown): string => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0
  }).format(safeParse(amount)).replace('BDT', '৳');
};

export const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const getDateString = (item: any): Date => {
  if (item?.toDate) return item.toDate();
  if (item?.seconds) return new Date(item.seconds * 1000);
  if (typeof item === 'string') return new Date(item);
  return new Date();
};
