export const handleTimeout = async (handler) => {
  const pageData = new Promise((resolve) => {
    resolve(handler());
  });

  const timeout = new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          error: true,
          message: 'The webpage taking too long to open.',
        }),
      15000
    );
  });

  const data = await Promise.race([pageData, timeout]);

  return data;
};
