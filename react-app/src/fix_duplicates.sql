-- Prevent duplicate payroll records for the same employee in the same month
ALTER TABLE public.payrolls 
ADD CONSTRAINT unique_employee_pay_period UNIQUE (employee_id, pay_period);
