export async function pause(milliseconds: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), milliseconds);
  });
}

export async function timeout(milliseconds: number, message?: string) {
  const errorMessage = message ? message : `Operation Timeout after ${milliseconds} milliseconds`;
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), milliseconds);
  });
}
