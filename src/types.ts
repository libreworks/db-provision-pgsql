/**
 * A set of user credentials.
 */
export type Credentials = {
  /**
   * The username.
   */
  username: string;
  /**
   * The user's password.
   */
  password: string;
};

/**
 * A set of user credentials for a network service.
 */
export type NetworkCredentials = Credentials & {
  /**
   * The network hostname or IP address.
   */
  host: string;
  /**
   * The port number.
   */
  port: number;
};
