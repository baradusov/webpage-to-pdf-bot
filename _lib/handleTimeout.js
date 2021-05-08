module.exports = async (handler) => {
  const data = new Promise((resolve) => {
    resolve(handler());
  });

  const timeout = new Promise((resolve) => {
    setTimeout(
      () =>
        resolve({
          pdf: false,
          message: 'The webpage taking too long to open.',
        }),
      28000
    );
  });

  const { pdf, name, message } = await Promise.race([data, timeout]);

  return { pdf, name, message };
};
