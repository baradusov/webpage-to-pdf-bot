export const handleTimeout = async (handler, timeoutMs = 15000) => {
  const controller = new AbortController();
  let timeoutId;

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      resolve({
        error: true,
        message: 'The webpage taking too long to open.',
      });
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      handler(controller.signal),
      timeoutPromise,
    ]);

    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    controller.abort();
    throw error;
  }
};
