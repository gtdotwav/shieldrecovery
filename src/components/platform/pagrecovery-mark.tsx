import { cn } from "@/lib/utils";

type PagRecoveryMarkProps = {
  className?: string;
  title?: string;
};

export function PagRecoveryMark({
  className,
  title = "PagRecovery",
}: PagRecoveryMarkProps) {
  return (
    <svg
      viewBox="0 0 210 260"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pagrecovery-stroke" x1="24" y1="24" x2="182" y2="246" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4BE38C" />
          <stop offset="0.55" stopColor="#1ED760" />
          <stop offset="1" stopColor="#0FA47A" />
        </linearGradient>
        <linearGradient id="pagrecovery-fill" x1="42" y1="26" x2="168" y2="246" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1f6b4f" />
          <stop offset="1" stopColor="#0d3d2f" />
        </linearGradient>
        <filter id="pagrecovery-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.1176 0 0 0 0 0.8431 0 0 0 0 0.3765 0 0 0 0.34 0"
          />
        </filter>
        <clipPath id="pagrecovery-shape">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M63.866 23.5H140.3C170.925 23.5 186.5 39.243 186.5 70.236V108.95C186.5 137.677 171.907 157.977 144.353 168.618L91.318 188.863L76.194 246.5H24.5L46.377 163.355C53.264 137.186 71.916 118.069 96.712 109.772L121.813 101.175C137.302 95.83 144.975 84.723 144.975 69.278C144.975 51.902 133.592 42.004 113.825 42.004H74.886L67.784 76.454H27.625L41.772 31.631C43.649 25.689 48.9 23.5 63.866 23.5ZM73.4 74.478H113.117C122.773 74.478 129.119 69.172 129.119 60.61C129.119 51.783 122.975 47.115 113.117 47.115H78.332L73.4 74.478Z"
          />
        </clipPath>
      </defs>

      <path
        d="M63.866 23.5H140.3C170.925 23.5 186.5 39.243 186.5 70.236V108.95C186.5 137.677 171.907 157.977 144.353 168.618L91.318 188.863L76.194 246.5H24.5L46.377 163.355C53.264 137.186 71.916 118.069 96.712 109.772L121.813 101.175C137.302 95.83 144.975 84.723 144.975 69.278C144.975 51.902 133.592 42.004 113.825 42.004H74.886L67.784 76.454H27.625L41.772 31.631C43.649 25.689 48.9 23.5 63.866 23.5Z"
        fill="url(#pagrecovery-fill)"
      />
      <path
        d="M63.866 23.5H140.3C170.925 23.5 186.5 39.243 186.5 70.236V108.95C186.5 137.677 171.907 157.977 144.353 168.618L91.318 188.863L76.194 246.5H24.5L46.377 163.355C53.264 137.186 71.916 118.069 96.712 109.772L121.813 101.175C137.302 95.83 144.975 84.723 144.975 69.278C144.975 51.902 133.592 42.004 113.825 42.004H74.886L67.784 76.454H27.625L41.772 31.631C43.649 25.689 48.9 23.5 63.866 23.5Z"
        fill="none"
        stroke="url(#pagrecovery-stroke)"
        strokeWidth="8"
        strokeLinejoin="round"
        filter="url(#pagrecovery-glow)"
      />

      <g clipPath="url(#pagrecovery-shape)" opacity="0.96">
        <rect x="18" y="18" width="175" height="232" fill="#0f231b" />
        <g fill="#206b4f">
          <rect x="33" y="37" width="9" height="9" />
          <rect x="42" y="37" width="9" height="9" />
          <rect x="60" y="37" width="9" height="9" />
          <rect x="69" y="37" width="9" height="9" />
          <rect x="78" y="37" width="9" height="9" />
          <rect x="96" y="37" width="9" height="9" />
          <rect x="105" y="37" width="9" height="9" />
          <rect x="123" y="37" width="9" height="9" />
          <rect x="132" y="37" width="9" height="9" />
          <rect x="150" y="37" width="9" height="9" />
          <rect x="33" y="55" width="9" height="9" />
          <rect x="51" y="55" width="9" height="9" />
          <rect x="69" y="55" width="9" height="9" />
          <rect x="87" y="55" width="9" height="9" />
          <rect x="105" y="55" width="9" height="9" />
          <rect x="123" y="55" width="9" height="9" />
          <rect x="141" y="55" width="9" height="9" />
          <rect x="42" y="64" width="9" height="9" />
          <rect x="60" y="64" width="9" height="9" />
          <rect x="78" y="64" width="9" height="9" />
          <rect x="96" y="64" width="9" height="9" />
          <rect x="114" y="64" width="9" height="9" />
          <rect x="132" y="64" width="9" height="9" />
          <rect x="150" y="64" width="9" height="9" />
          <rect x="33" y="82" width="9" height="9" />
          <rect x="51" y="82" width="9" height="9" />
          <rect x="69" y="82" width="9" height="9" />
          <rect x="87" y="82" width="9" height="9" />
          <rect x="105" y="82" width="9" height="9" />
          <rect x="123" y="82" width="9" height="9" />
          <rect x="141" y="82" width="9" height="9" />
          <rect x="42" y="91" width="9" height="9" />
          <rect x="60" y="91" width="9" height="9" />
          <rect x="96" y="91" width="9" height="9" />
          <rect x="114" y="91" width="9" height="9" />
          <rect x="132" y="91" width="9" height="9" />
          <rect x="150" y="91" width="9" height="9" />
          <rect x="51" y="109" width="9" height="9" />
          <rect x="69" y="109" width="9" height="9" />
          <rect x="87" y="109" width="9" height="9" />
          <rect x="105" y="109" width="9" height="9" />
          <rect x="123" y="109" width="9" height="9" />
          <rect x="141" y="109" width="9" height="9" />
          <rect x="33" y="127" width="9" height="9" />
          <rect x="51" y="127" width="9" height="9" />
          <rect x="69" y="127" width="9" height="9" />
          <rect x="87" y="127" width="9" height="9" />
          <rect x="105" y="127" width="9" height="9" />
          <rect x="123" y="127" width="9" height="9" />
          <rect x="141" y="127" width="9" height="9" />
          <rect x="33" y="145" width="9" height="9" />
          <rect x="60" y="145" width="9" height="9" />
          <rect x="78" y="145" width="9" height="9" />
          <rect x="96" y="145" width="9" height="9" />
          <rect x="114" y="145" width="9" height="9" />
          <rect x="132" y="145" width="9" height="9" />
          <rect x="150" y="145" width="9" height="9" />
          <rect x="42" y="154" width="9" height="9" />
          <rect x="69" y="154" width="9" height="9" />
          <rect x="87" y="154" width="9" height="9" />
          <rect x="105" y="154" width="9" height="9" />
          <rect x="123" y="154" width="9" height="9" />
          <rect x="141" y="154" width="9" height="9" />
          <rect x="33" y="172" width="9" height="9" />
          <rect x="51" y="172" width="9" height="9" />
          <rect x="69" y="172" width="9" height="9" />
          <rect x="87" y="172" width="9" height="9" />
          <rect x="105" y="172" width="9" height="9" />
          <rect x="123" y="172" width="9" height="9" />
          <rect x="141" y="172" width="9" height="9" />
          <rect x="33" y="190" width="9" height="9" />
          <rect x="51" y="190" width="9" height="9" />
          <rect x="69" y="190" width="9" height="9" />
          <rect x="87" y="190" width="9" height="9" />
          <rect x="105" y="190" width="9" height="9" />
          <rect x="123" y="190" width="9" height="9" />
          <rect x="33" y="208" width="9" height="9" />
          <rect x="51" y="208" width="9" height="9" />
          <rect x="69" y="208" width="9" height="9" />
          <rect x="87" y="208" width="9" height="9" />
        </g>
        <g fill="#48d085">
          <rect x="42" y="46" width="9" height="9" />
          <rect x="51" y="46" width="9" height="9" />
          <rect x="87" y="46" width="9" height="9" />
          <rect x="96" y="46" width="9" height="9" />
          <rect x="114" y="46" width="9" height="9" />
          <rect x="132" y="46" width="9" height="9" />
          <rect x="60" y="55" width="9" height="9" />
          <rect x="78" y="55" width="9" height="9" />
          <rect x="96" y="55" width="9" height="9" />
          <rect x="114" y="55" width="9" height="9" />
          <rect x="150" y="55" width="9" height="9" />
          <rect x="51" y="64" width="9" height="9" />
          <rect x="69" y="64" width="9" height="9" />
          <rect x="87" y="64" width="9" height="9" />
          <rect x="123" y="64" width="9" height="9" />
          <rect x="141" y="64" width="9" height="9" />
          <rect x="33" y="73" width="9" height="9" />
          <rect x="60" y="73" width="9" height="9" />
          <rect x="78" y="73" width="9" height="9" />
          <rect x="96" y="73" width="9" height="9" />
          <rect x="114" y="73" width="9" height="9" />
          <rect x="132" y="73" width="9" height="9" />
          <rect x="150" y="73" width="9" height="9" />
          <rect x="51" y="91" width="9" height="9" />
          <rect x="69" y="91" width="9" height="9" />
          <rect x="87" y="91" width="9" height="9" />
          <rect x="123" y="91" width="9" height="9" />
          <rect x="141" y="91" width="9" height="9" />
          <rect x="33" y="100" width="9" height="9" />
          <rect x="60" y="100" width="9" height="9" />
          <rect x="78" y="100" width="9" height="9" />
          <rect x="96" y="100" width="9" height="9" />
          <rect x="114" y="100" width="9" height="9" />
          <rect x="132" y="100" width="9" height="9" />
          <rect x="150" y="100" width="9" height="9" />
          <rect x="42" y="118" width="9" height="9" />
          <rect x="60" y="118" width="9" height="9" />
          <rect x="78" y="118" width="9" height="9" />
          <rect x="96" y="118" width="9" height="9" />
          <rect x="114" y="118" width="9" height="9" />
          <rect x="132" y="118" width="9" height="9" />
          <rect x="51" y="136" width="9" height="9" />
          <rect x="69" y="136" width="9" height="9" />
          <rect x="87" y="136" width="9" height="9" />
          <rect x="105" y="136" width="9" height="9" />
          <rect x="123" y="136" width="9" height="9" />
          <rect x="141" y="136" width="9" height="9" />
          <rect x="33" y="154" width="9" height="9" />
          <rect x="51" y="154" width="9" height="9" />
          <rect x="78" y="154" width="9" height="9" />
          <rect x="96" y="154" width="9" height="9" />
          <rect x="114" y="154" width="9" height="9" />
          <rect x="132" y="154" width="9" height="9" />
          <rect x="42" y="163" width="9" height="9" />
          <rect x="60" y="163" width="9" height="9" />
          <rect x="87" y="163" width="9" height="9" />
          <rect x="105" y="163" width="9" height="9" />
          <rect x="123" y="163" width="9" height="9" />
          <rect x="141" y="163" width="9" height="9" />
          <rect x="51" y="181" width="9" height="9" />
          <rect x="69" y="181" width="9" height="9" />
          <rect x="87" y="181" width="9" height="9" />
          <rect x="105" y="181" width="9" height="9" />
          <rect x="123" y="181" width="9" height="9" />
          <rect x="42" y="199" width="9" height="9" />
          <rect x="60" y="199" width="9" height="9" />
          <rect x="78" y="199" width="9" height="9" />
          <rect x="96" y="199" width="9" height="9" />
        </g>
        <g stroke="#5be198" strokeWidth="7" fill="none" opacity="0.9">
          <rect x="31.5" y="34.5" width="36" height="36" />
          <rect x="128.5" y="34.5" width="36" height="36" />
          <rect x="31.5" y="189.5" width="36" height="36" />
        </g>
        <g fill="#0d241c">
          <rect x="42" y="45" width="15" height="15" />
          <rect x="139" y="45" width="15" height="15" />
          <rect x="42" y="200" width="15" height="15" />
        </g>
      </g>
    </svg>
  );
}
