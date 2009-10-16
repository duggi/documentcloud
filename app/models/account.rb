class Account < ActiveRecord::Base
  
  belongs_to :organization
  has_one :security_key, :as => :securable, :dependent => :destroy
  
  validates_presence_of   :first_name, :last_name, :email
  validates_format_of     :email, :with => DC::Validators::EMAIL
  validates_uniqueness_of :email
  
  delegate :name, :to => :organization, :prefix => true
  
  # A whitelist of Account attributes that should be sent down to the client.
  CLIENT_SIDE_ATTRIBUTES = %w(
    id first_name last_name email hashed_email organization_id organization_name
  )
  
  # Attempt to log in with an email address and password.
  def self.log_in(email, password, session)
    account = Account.find_by_email(email)
    return false unless account && account.password == password
    account.authenticate(session)
  end
  
  # Save this account as the current account in the session. Logs a visitor in.
  def authenticate(session)
    session['account_id'] = id
    session['organization_id'] = organization_id
    self
  end
  
  # When an account is created by a third party, send an email with a secure
  # key to set the password.
  def send_login_instructions
    create_security_key
    LifecycleMailer.deliver_login_instructions(self)
  end
  
  def full_name
    "#{first_name} #{last_name}"
  end
  
  def rfc_email
    "\"#{full_name}\" <#{email}>"
  end
  
  # MD5 hash of processed email address, for use in Gravatar URLs.
  def hashed_email
    @hashed_email ||= Digest::MD5.hexdigest(email.downcase.gsub(/\s/, ''))
  end
  
  # Has this account been assigned, but never logged into, with no password set?
  def pending?
    !hashed_password
  end
  
  # It's slo-o-o-w to compare passwords. Which is a mixed bag, but mostly good.
  def password
    return false if hashed_password.nil?
    @password ||= BCrypt::Password.new(hashed_password)
  end
  
  # BCrypt'd passwords helpfuly have the salt built-in.
  def password=(new_password)
    @password = BCrypt::Password.create(new_password, :cost => 8)
    self.hashed_password = @password
  end
  
  def as_json(opts={})
    hash = CLIENT_SIDE_ATTRIBUTES.inject({}) {|h, name| h[name] = send(name); h }
    hash['pending'] = pending?
    hash
  end
  
end